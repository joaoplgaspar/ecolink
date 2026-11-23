# ECOLINK no Supabase

O app roda de dois jeitos, **com as mesmas telas**:

| Modo             | Onde ficam os dados                   | Para quê                                                 |
| ---------------- | ------------------------------------- | -------------------------------------------------------- |
| `local` (padrão) | no navegador (`localStorage`)         | demonstração offline, testes, plano B na apresentação    |
| `supabase`       | Postgres no Supabase (local ou nuvem) | banco de verdade, várias pessoas em aparelhos diferentes |

A escolha é feita **no build**, pela variável `VITE_FONTE_DADOS`. Um plugin do Vite (`scripts/vite-fonte-dados.js`) troca `src/data/<arquivo>` por `src/data/supabase/<arquivo>` quando ele existe — o bundle do modo Supabase nem contém o banco local, e o do modo local não contém o `supabase-js` ([ADR 0008](./adr/0008-supabase-com-seguranca-no-banco.md)).

---

## Segurança: onde ela mora agora

No modo local, as regras rodam no navegador (uma simulação honesta). No Supabase, **quem protege os dados é o banco**:

1. **RLS ligada em todas as tabelas** (`supabase/migrations/…_seguranca.sql`). A chave pública fica visível no navegador — e mesmo assim cada pessoa só lê o que pode:
   - cidadão: só as próprias entregas, extrato, notificações e perfil;
   - equipe do ponto: **não lê a tabela de entregas** — usa funções que trocam o id do cidadão pelo nome reduzido ("Ana R.");
   - **código de entrega** numa tabela à parte que **só o dono** lê (nem a equipe, nem a plataforma);
   - avaliações públicas **sem a coluna de quem avaliou** (privilégio por coluna).
2. **Nenhuma escrita direta** nas tabelas sensíveis: `insert/update/delete` revogados de `anon` e `authenticated`. Tudo passa por **funções `security definer`** que conferem `auth.uid()`:
   `solicitar_coleta`, `aceitar_coleta`, `recusar_coleta`, `cancelar_coleta`, `checkin_coleta`, `registrar_pesagem`, `resgatar`, `alterar_recebimento`, `trocar_perfil`, `aceitar_termos`.
3. **EcoPontos só pela balança do ponto**: o crédito no extrato nasce dentro de `registrar_pesagem`; o resgate, dentro de `resgatar` (custo do catálogo no banco, saldo recalculado com a conta travada — sem gasto duplo).
4. **Ninguém se promove**: o cadastro sempre cria perfil de cidadão (papéis enviados pelo navegador são ignorados) e só nome/telefone/cidade são editáveis.
5. **Execução de funções negada por padrão** (o Supabase libera para `anon`; aqui é revogado e liberado uma a uma).
6. **Relógio no servidor**: `pg_cron` chama `processar_prazos()` a cada minuto (expira solicitações e marca "não compareceu").
7. A chave **`service_role` nunca vai para o front end nem para o repositório**. Um teste garante que nenhum módulo de `src/data/supabase` a usa.

Tudo isso é provado por **61 testes pgTAP** (`supabase/tests/`), que entram como cada pessoa (como o PostgREST faz com o JWT) e tentam o que não podem.

---

## Rodar com o Supabase local (recomendado para desenvolver)

Pré-requisitos: **Docker** e o **Supabase CLI** (`npm i -g supabase` ou `brew install supabase/tap/supabase`).

```bash
supabase start          # sobe Postgres, Auth e API; aplica migrações + seed
```

```bash
supabase status         # mostra a API URL e a "Publishable key" (pública)
```

Crie `.env.supabase.local` a partir de `.env.supabase.local.example` e cole a chave pública. Depois:

```bash
npm run dev:supabase    # http://localhost:5173, falando com o Supabase local
```

As contas de demonstração são as mesmas do modo local (senha `senha123`), geradas do mesmo seed.

| Comando                  | O que faz                                                                     |
| ------------------------ | ----------------------------------------------------------------------------- |
| `supabase db reset`      | recria o banco do zero (migrações + `supabase/seed.sql`) — "restaurar dados"  |
| `supabase test db`       | roda os testes pgTAP de `supabase/tests`                                      |
| `npm run test:banco`     | os mesmos testes, sem o CLI (só Docker): sobe um Postgres do Supabase e testa |
| `npm run e2e:supabase`   | a jornada no navegador contra o Supabase (precisa das variáveis acima)        |
| `npm run seed:supabase`  | gera de novo `supabase/seed.sql` a partir de `src/data/seed.js`               |
| `npm run build:supabase` | build de produção do modo Supabase em `dist-supabase/`                        |

> O seed tem datas **relativas ao dia em que roda**: depois de alguns dias, `supabase db reset` deixa a demonstração "fresca" de novo (a entrega do Diego volta a ser hoje).

## Publicar num projeto Supabase (nuvem)

1. Crie um projeto em [supabase.com](https://supabase.com) (região São Paulo).
2. Ligue o repositório ao projeto e envie as migrações:

   ```bash
   supabase login
   ```

   ```bash
   supabase link --project-ref <id-do-projeto>
   ```

   ```bash
   supabase db push
   ```

3. **Dados de demonstração** (opcional — só num projeto de demonstração, nunca em produção, porque as contas têm senha conhecida):

   ```bash
   supabase db push --include-seed
   ```

4. No painel do projeto:
   - **Integrations → Cron**: confira o job `ecolink-prazos` (a migração ativa o `pg_cron` e agenda o relógio das entregas sozinha);
   - **Authentication → URL Configuration**: coloque a URL onde o app vai ficar;
   - **Authentication → Email Templates → Reset password**: use `{{ .Token }}` no corpo, porque o app pede o **código** de 6 dígitos (como no modo local).
5. Na hospedagem do front end (Vercel, Netlify…), defina `VITE_FONTE_DADOS=supabase`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (a chave **pública**) e rode `npm run build`.

**Nunca** coloque a `service_role` (ou "secret key") no front end, num `.env` versionado ou no CI do app: ela ignora a RLS.

---

## O que já está no Supabase (e o que vem depois)

A migração é feita **por etapas**. O que ainda não migrou responde **501** com uma mensagem clara ("chega numa próxima etapa"), sem quebrar as outras telas — o plugin gera esses módulos a partir das exportações do modo local, então nenhuma tela fica sem a função que importa.

| Área                                                                  | Situação no Supabase                                                              |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Cadastro, login, sair, troca de perfil, troca e recuperação de senha  | ✅ Supabase Auth (bcrypt, JWT, limite de tentativas, "sair dos outros aparelhos") |
| Mapa e página do ponto, avaliações públicas, reputação do ponto       | ✅ leitura pública com RLS (reputação calculada pelas mesmas fórmulas)            |
| Agendamento por janela, cancelamento, código de entrega e QR          | ✅ funções do banco + agenda montada com a ocupação anônima                       |
| Painel do ponto: aceitar, recusar, check-in com bloqueio, pesagem     | ✅ funções do banco, divergência de peso, comprovante                             |
| Extrato, loja de recompensas, notificações, estatísticas              | ✅                                                                                |
| Prazos (expiração, não comparecimento)                                | ✅ `pg_cron` no servidor                                                          |
| Telas atualizando sozinhas                                            | ✅ consulta a cada 10 s e após cada ação (próximo passo: Supabase Realtime)       |
| Avaliar a entrega / o cidadão; reputação do cidadão para o ponto      | ⏳ próxima etapa (tabela `avaliacoes_cidadao` e funções)                          |
| Denúncias, moderação, sanções, recursos, contestação, bloqueios       | ⏳ próxima etapa                                                                  |
| Chat, equipe e convites, estoque/destinação/rastreio, relatórios      | ⏳ próxima etapa                                                                  |
| Cadastro de organização e de pontos, documentos (Storage), aprovações | ⏳ próxima etapa (Supabase Storage com buckets privados)                          |
| LGPD (exportar/excluir), entrega avulsa por QR pessoal                | ⏳ próxima etapa                                                                  |

Para migrar uma área: escreva a migração SQL (tabelas + RLS + funções) e os testes pgTAP, depois sobrescreva as funções em `src/data/supabase/repos/<área>.js` — o resto continua respondendo 501 até chegar a vez dele.

## Arquivos

```
supabase/
  config.toml                 configuração do Supabase local (CLI)
  migrations/                 esquema, segurança (RLS), funções da jornada, dados, loja
  seed.sql                    GERADO de src/data/seed.js (npm run seed:supabase)
  tests/                      testes pgTAP (supabase test db / npm run test:banco)
src/data/supabase/
  cliente.js                  supabase-js, sessão por aba, erros PTxxx → ErroApi
  storage.js                  "assinar": avisa as telas para buscar de novo
  repos/*.js                  mesma interface de src/data/repos/*.js
scripts/
  vite-fonte-dados.js         troca de fonte no build + módulos "ainda não migrado"
  testar-banco.sh             testes do banco só com Docker
e2e/supabase/                 jornada no navegador contra o Supabase
```
