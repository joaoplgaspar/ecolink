# ♻️ ECOLINK — Front End

Front end (React + Vite) da plataforma **ECOLINK**, que conecta pessoas a **pontos de coleta** de recicláveis, permite **agendar coletas** e premia quem recicla com **gamificação** (EcoPontos, níveis, conquistas e ranking).

> Projeto Integrador. Espelha o domínio da API **reciclaja-api** (usuários, pontos de coleta e coletas) e adiciona, no front, as mecânicas prometidas no projeto.

---

## 🧩 Funcionalidades

**MVP (núcleo, fiel à API)**

- Login / cadastro com **senha protegida por hash**, sessões que expiram e recuperação de senha
- **Mapa interativo** (Leaflet + OpenStreetMap) com **busca por endereço**, **"usar minha localização"** e pontos ordenados por **distância**; filtro por cidade e material
- Detalhe do ponto (materiais aceitos, horário, localização no mapa)
- Agendar coleta (material, quantidade em kg, data)
- Minhas coletas com status (**agendada → concluída → cancelada**)
- Perfil do usuário

**Perfis e segurança** (Fase 1 do [ROADMAP](./ROADMAP.md))

- 👥 **Três perfis**: **Cidadão**, **Parceiro** (gestor/operador de ponto de coleta) e **Plataforma** (moderação/administração), cada um com seu menu e sua cor. Quem tem mais de um alterna pelo seletor "Usar como".
- 🔐 **Senhas com hash PBKDF2** (600 mil iterações, sal por usuário), política de senha com medidor de força e bloqueio de senhas óbvias
- 🚫 **Bloqueio progressivo** após 5 tentativas erradas (30 s → 1 min → 5 min → 15 min), sem revelar quais e-mails existem
- ⏱️ **Sessões** com token aleatório (só o hash fica salvo), expiração após 7 dias sem uso e **30 min de inatividade** nos perfis parceiro/plataforma; lista de dispositivos conectados e "sair dos outros dispositivos"
- 🔑 **Recuperação de senha** por código de 6 dígitos (válido por 15 min, uso único, máx. 5 tentativas)
- 🛡️ **Permissões na camada de dados** (`src/domain/permissoes.js`): a tela esconde botões, mas quem bloqueia é o repositório, inclusive conflito de interesse (gestor não agenda nem avalia o próprio ponto)
- 🕵️ **Minimização de dados**: o ponto vê só "Ana R.", nunca telefone ou e-mail
- 📜 **Termos e privacidade (LGPD)** com aceite versionado; **log de auditoria**, incluindo tentativas negadas
- 🧑‍⚖️ **Plataforma**: lista de usuários, suspensão de contas (encerra as sessões na hora) e auditoria

**Diferenciais**

- 🏆 **Gamificação** — EcoPontos por kg reciclado, níveis (Bronze→Platina), conquistas e **dashboard de impacto** (CO₂, água, energia, árvores)
- 🎁 **Loja de recompensas** — troque EcoPontos (saldo) por brindes e descontos de parceiros, com geração de **voucher**
- ⭐ **Avaliações dos pontos** — nota por estrelas + comentários
- 📚 **Modo educação** — cores da coleta seletiva, guia por material e **quiz interativo**
- 💬 **Chat** com os pontos de coleta (com resposta automática simulada)
- 🔔 **Notificações** (lembretes, coleta concluída, recompensas)
- 🏅 **Ranking** entre os usuários
- 📱 **PWA** — instalável no celular e funciona offline após a primeira visita

> EcoPontos: você **ganha** concluindo coletas e **gasta** na loja (saldo = ganhos − resgates). Nível, ranking e conquistas usam o total **acumulado** (não diminui ao resgatar).
> Para testar a instalação do PWA, rode a versão de produção: `npm run build && npm run preview`.

---

## 🗃️ Dados (no dispositivo, com cara de API)

Ainda não há banco de dados real: tudo fica salvo **no navegador** (`localStorage`). Mas o app já é construído **como se falasse com um servidor**:

- **Repositórios assíncronos** (`src/data/repos/`): toda leitura/escrita é uma `Promise`, com **latência simulada** e erros com **status HTTP** (401, 404, 409, 422, 503…). As telas tratam carregando, erro e "tentar de novo". Para plugar um back end (ex.: Supabase), reimplementa-se só essa pasta.
- **Regras na camada de dados**, não só na tela: saldo da loja, data no passado, material aceito pelo ponto, campos editáveis do perfil, etc.
- **Transações atômicas**: se algo falha no meio, nada é gravado.
- **Migrações versionadas** (`src/data/migrations.js`): dados salvos por versões antigas do app são atualizados, não perdidos.
- **Sincronização entre abas**: abra o app em duas abas, mude algo em uma e veja a outra atualizar sozinha.
- **Seed com datas relativas a hoje** (`src/data/seed.js`): 10 cidadãos, equipe de pontos e da plataforma, 8 pontos e cerca de 60 coletas nos últimos 60 dias. É determinístico: "Restaurar dados" sempre gera a mesma estrutura.
- **Sessão por aba**: cada aba tem a própria sessão, então dá para ter o cidadão numa janela e o reciclador na outra ao mesmo tempo. "Manter conectado" guarda a sessão para novas abas.

### Contas de demonstração (senha de todas: `senha123`)

| Perfil     | E-mail                  | Quem é                                                             |
| ---------- | ----------------------- | ------------------------------------------------------------------ |
| Cidadão    | `ana@email.com`         | Cidadã com histórico completo (+ Bruno, Carla e mais 7)            |
| Parceiro   | `marcos@email.com`      | Gestor do EcoPonto Centro e da Recicla Pinheiros; também é cidadão |
| Parceiro   | `paula@email.com`       | Operadora da Coleta Vila Madalena                                  |
| Plataforma | `moderacao@ecolink.app` | Moderação (consulta usuários e auditoria)                          |
| Plataforma | `admin@ecolink.app`     | Administração (também suspende e reativa contas)                   |

> A senha de demonstração é conhecida e já fica guardada como hash. Contas criadas pelo cadastro seguem a política de senha (mínimo 8 caracteres, sem senhas óbvias).

### Modo demonstração (tela de login)

- **Entrar com um clique** em qualquer conta acima.
- **Simular rede**: normal, lenta ou instável (30% das chamadas falham), para mostrar os estados de carregando, erro e "tentar de novo".
- **Caixa de e-mail** (`/demo/emails`): onde chegam os códigos de recuperação de senha e os avisos de segurança.
- **Restaurar dados** de demonstração.

**Dica para a banca:** abra duas janelas lado a lado, uma com a Ana e outra com o Marcos. Agende uma coleta no EcoPonto Centro com a Ana e veja a entrega aparecer no painel do Marcos na hora.

---

## 🚀 Como rodar

> Pré-requisito: **Node.js 18+**.

```bash
npm install     # instala as dependências
npm run dev     # sobe em http://localhost:5173
```

| Comando            | O que faz                                    |
| ------------------ | -------------------------------------------- |
| `npm run dev`      | servidor de desenvolvimento                  |
| `npm run build`    | build de produção (depois `npm run preview`) |
| `npm test`         | testes automatizados (Vitest)                |
| `npm run coverage` | testes + relatório de cobertura              |
| `npm run lint`     | análise estática (ESLint)                    |
| `npm run format`   | formata o código (Prettier)                  |
| `npm run check`    | tudo acima, como no CI                       |

O **GitHub Actions** (`.github/workflows/ci.yml`) roda lint, formatação, testes e build a cada push e pull request.

---

## 🛠️ Tecnologias

- **React 18** + **Vite** — UI e build
- **React Router** — navegação entre telas
- **Leaflet** + **react-leaflet** — mapa interativo (tiles do OpenStreetMap)
- **lucide-react** — ícones (SVG)
- **framer-motion** — animações e transições
- **CSS puro** (tema em `src/index.css`, sem framework)
- **localStorage** — persistência mock

> ℹ️ O **mapa** e a **busca por endereço** (geocodificação via Nominatim/OpenStreetMap) precisam de **internet**. O resto do app funciona offline. A geolocalização pede permissão do navegador.

## 📁 Estrutura

```
src/
├── main.jsx                 # entrada
├── index.css                # tema (paleta "eco")
├── app/                     # rotas, sessão (AuthContext), layout
├── domain/                  # REGRAS PURAS, sem React — gamificação, permissões, senhas, termos…
├── data/
│   ├── storage.js           # armazenamento: cache, transações, abas, recuperação
│   ├── migrations.js        # versões do formato dos dados
│   ├── seed.js              # dados de demonstração (relativos a hoje)
│   ├── config.js            # latência/falhas simuladas
│   ├── erros.js             # ErroApi (status no estilo HTTP)
│   ├── sessaoCliente.js     # onde o navegador guarda o token (por aba)
│   └── repos/               # "API": auth, usuarios, pontos, coletas, parceiro, admin…
├── hooks/                   # useQuery, useMutation, useDbVersion
├── features/
│   ├── auth/                # login, cadastro, recuperação de senha, painel demo
│   ├── cidadao/pages/       # área do cliente
│   ├── parceiro/pages/      # painel do ponto de coleta
│   ├── admin/pages/         # usuários e auditoria
│   └── shared/pages/        # chat, perfil (segurança), termos, caixa de e-mail demo
├── components/              # UI reutilizável, mapa, ícones
└── utils/                   # datas, formatação, geolocalização
```

Os testes ficam ao lado do código (`*.test.js`). O planejamento das próximas fases está em [`ROADMAP.md`](./ROADMAP.md).
