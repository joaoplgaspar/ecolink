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

## Passo a passo SEM Docker (projeto na nuvem) — o caminho para a banca

Só precisa de navegador, Node.js e uma conta gratuita no [supabase.com](https://supabase.com). Nada de Docker nem de Supabase CLI.

### 1. Criar o banco (uma vez, uns 10 minutos)

1. Em [supabase.com](https://supabase.com) → **New project**. Região **South America (São Paulo)**. Guarde a senha do banco (não vai para o app).
2. No projeto, abra **SQL Editor → New query**, cole **todo** o conteúdo de [`supabase/painel/1-instalar.sql`](../supabase/painel/1-instalar.sql) e clique em **Run**. Isso cria as tabelas, a segurança (RLS) e as funções. Rode **uma vez só**.
3. Nova query com **todo** o [`supabase/painel/2-dados-demo.sql`](../supabase/painel/2-dados-demo.sql) → **Run**. Cria as contas de demonstração (senha `senha123`), os pontos e as entregas.
4. **Authentication → Sign In / Providers → Email**: desligue **Confirm email** (senão quem se cadastrar na hora da apresentação precisa confirmar pelo e-mail).
5. **Integrations → Cron**: confira se existe o job `ecolink-prazos` (o relógio das entregas). Se não existir, ative o Cron ali e rode de novo só o último bloco `do $$ … $$` de `1-instalar.sql`.
6. **Project Settings → API Keys**: copie a **Project URL** e a chave **publishable** (ou **anon**). **Não** copie a `secret`/`service_role`.

> **Restaurar dados**: rode `2-dados-demo.sql` de novo quando quiser. Ele apaga tudo e recria a demonstração com as datas relativas ao dia — rode **na manhã da apresentação** para a entrega do Diego ser "hoje".
>
> Projetos gratuitos **pausam depois de 7 dias sem uso**: abra o painel um dia antes da banca e, se estiver pausado, clique em **Restore**.

### 2a. Rodar o app no seu computador (só Node)

Na pasta do projeto, crie o arquivo `.env.supabase.local` (copie de `.env.supabase.local.example`):

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

```bash
npm install
```

```bash
npm run dev:supabase
```

Abra http://localhost:5173. Para mostrar os dois lados, use duas janelas (ou uma anônima): a cidadã numa, o ponto na outra — agora cada uma pode estar até num aparelho diferente.

### 2b. Ou publicar o site com link (Vercel, grátis)

1. Em [vercel.com](https://vercel.com), **Add New → Project** e importe o repositório do GitHub (escolha a branch com o código).
2. Em **Environment Variables**, adicione:
   - `VITE_FONTE_DADOS` = `supabase`
   - `VITE_SUPABASE_URL` = a Project URL
   - `VITE_SUPABASE_ANON_KEY` = a chave publishable/anon
3. **Deploy**. O `vercel.json` já cuida das rotas do app. (Na Netlify também funciona: o `public/_redirects` faz o mesmo papel.)
4. No Supabase, **Authentication → URL Configuration → Site URL**: coloque o endereço que a Vercel gerou.

Sem as variáveis, o mesmo projeto publica o **modo local** (dados no navegador) — útil como plano B.

### 3. Provar a segurança sem Docker

Os testes do banco rodam no **GitHub Actions** (que tem Docker): os jobs `banco` (61 testes pgTAP) e `e2e-supabase` (a jornada no navegador contra o Supabase) aparecem verdes num pull request. Na banca, dá para mostrar a aba **Checks** do PR e abrir `supabase/tests/01_seguranca_e_jornada.test.sql` para ler os casos ("Ana NÃO lança EcoPontos no próprio extrato", "ninguém opera a PRÓPRIA entrega"…).

Ao vivo, no **SQL Editor**, dá para mostrar a RLS funcionando, entrando como a Ana. Primeiro, o que ela consegue ver (com os dados de demonstração: **12** das 63 entregas e os 10 lançamentos do extrato dela). O bloco roda inteiro numa transação só; a troca de papel não fica valendo depois:

```sql
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select count(*) as entregas_que_a_ana_ve, (select count(*) from public.extrato) as lancamentos_dela
from public.coletas;
```

Depois, a Ana tentando se dar 9.999 EcoPontos direto no banco: **`permission denied for table extrato`**.

```sql
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
insert into public.extrato (usuario_id, tipo, valor) values ('00000000-0000-4000-8000-000000000001', 'bonus', 9999);
```

---

## Rodar com o Supabase local (opcional, precisa de Docker)

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

| Comando                  | O que faz                                                                     |
| ------------------------ | ----------------------------------------------------------------------------- |
| `supabase db reset`      | recria o banco do zero (migrações + `supabase/seed.sql`) — "restaurar dados"  |
| `supabase test db`       | roda os testes pgTAP de `supabase/tests`                                      |
| `npm run test:banco`     | os mesmos testes, sem o CLI (só Docker): sobe um Postgres do Supabase e testa |
| `npm run e2e:supabase`   | a jornada no navegador contra o Supabase (precisa das variáveis acima)        |
| `npm run seed:supabase`  | gera de novo `supabase/seed.sql` e `supabase/painel/*.sql`                    |
| `npm run build:supabase` | build de produção do modo Supabase em `dist-supabase/`                        |

Com o CLI também dá para enviar as migrações a um projeto na nuvem (`supabase link` + `supabase db push`), no lugar de colar os arquivos no SQL Editor.

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
