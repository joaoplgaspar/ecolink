# ♻️ ECOLINK — Front End

Front end (React + Vite) da plataforma **ECOLINK**, que conecta pessoas a **pontos de coleta** de recicláveis, permite **agendar coletas** e premia quem recicla com **gamificação** (EcoPontos, níveis, conquistas e ranking).

> Projeto Integrador. Espelha o domínio da API **reciclaja-api** (usuários, pontos de coleta e coletas) e adiciona, no front, as mecânicas prometidas no projeto.

---

## 🧩 Funcionalidades

**MVP (núcleo, fiel à API)**

- Login / cadastro com **senha protegida por hash**, sessões que expiram e recuperação de senha
- **Mapa interativo** (Leaflet + OpenStreetMap) com **busca por endereço**, **"usar minha localização"** e pontos ordenados por **distância**; filtro por cidade e material
- Detalhe do ponto (materiais aceitos, horário, localização no mapa)
- Agendar entrega (materiais, dia e janela com vagas)
- Minhas entregas com linha do tempo, código de entrega e comprovante
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

**Parceiros e pontos de coleta** (Fase 2 do [ROADMAP](./ROADMAP.md))

- 🏢 **"Seja parceiro"** (`/seja-parceiro`): cooperativas, associações, ecopontos públicos, empresas e catadores autônomos criam conta e cadastram a organização em 4 etapas, salvando a cada passo
- 🧾 **CNPJ validado pelos dígitos verificadores, inclusive o novo CNPJ alfanumérico** (formato da Receita Federal de julho/2026, ex.: `12.ABC.345/01DE-35`); CPF para catador autônomo
- 📎 **Upload de documentos e fotos** guardados no IndexedDB. O app confere a **assinatura real dos bytes** (um executável renomeado para `.pdf` é recusado), comprime fotos no aparelho e mantém documentos privados (só o responsável e a plataforma abrem)
- 📍 **Assistente de ponto em 6 etapas**: identificação e fotos → **mapa com alfinete** (busca de endereço, arrastar, "estou aqui") → **materiais com condições, o que não aceita, limite de kg e preço por kg** → **grade de horários com intervalos e exceções (feriados)** → regras de agendamento → **prévia exatamente como o cidadão verá**
- ✅ **Aprovação pela plataforma**: a organização e cada ponto passam por análise (aprovar ou pedir ajustes com motivo, com notificação no app e por e-mail). Rascunhos e pontos em análise **nunca** aparecem ao público
- 🔒 Depois de aprovado, **nome e endereço ficam travados** (o ponto verificado não pode "mudar de lugar" sem nova análise); o operacional muda na hora
- ⏯️ **"Recebendo / Pausado"**: qualquer pessoa da equipe pausa o recebimento; o cidadão vê "Não está recebendo"
- 🕐 Para o cidadão: **"Aberto agora · fecha às 18h"**, filtro "Abertos agora", selo **parceiro verificado**, horários da semana e regras de cada material; o agendamento **recusa dia fechado (com o motivo, ex.: Natal) e quantidade acima do limite do ponto**

**A jornada da entrega** (Fase 3 do [ROADMAP](./ROADMAP.md), o coração do projeto)

- 🗓️ **Agendamento por janela com vagas reais**: vários materiais por entrega, dias e horários conforme a agenda do ponto (capacidade, antecedência, feriados) e as condições de cada material à vista
- 📦 **Acompanhamento como num app de delivery**: solicitada → confirmada → em conferência → concluída, com **linha do tempo**, prazo de resposta do ponto e notificações
- 🔑 **Código de entrega de 4 dígitos e QR**: só o cidadão vê; o ponto faz o check-in digitando o código ou lendo o QR pela câmera. Códigos errados repetidos bloqueiam o check-in
- ⚖️ **Pesagem pelo ponto**: aprovação parcial, item trazido a mais e confirmação dupla quando o peso passa muito do declarado. **Quem gera EcoPontos é a balança do ponto, nunca o próprio cidadão**
- 🧾 **Comprovante** para os dois lados e **extrato de EcoPontos** (livro-caixa: cada crédito e débito registrado, nada é editado)
- 🛎️ **Painel de recebimentos** do parceiro: Novas (aviso sonoro), Hoje, Próximas e Finalizadas; aceitar, recusar ou cancelar com motivo
- 🙋 **Entrega sem agendamento** pelo QR pessoal do perfil
- ⏰ **Prazos automáticos**: solicitação sem resposta expira, falta vira "não compareceu" e um lembrete sai 24 h antes

**Confiança e reputação** (Fase 4 do [ROADMAP](./ROADMAP.md))

- ⭐ **Avaliações verificadas e bilaterais**: só avalia quem teve a entrega conferida, **uma avaliação por entrega**, com estrelas, destaques ("Atendimento rápido", "Material bem separado"…) e comentário; dá para editar por 7 dias. O ponto avalia o cidadão e o cidadão avalia o ponto
- 💬 **Resposta pública do ponto** a cada avaliação, com filtro "Sem resposta" no painel
- 🧮 **Reputação de 0 a 100 com fórmula explícita** (`src/domain/reputacao.js`): componentes com pesos públicos (comparecimento, peso declarado × balança, material conforme, avaliações, perfil, histórico) e **média bayesiana**, para que uma única nota não decida a reputação de ninguém. Quem tem menos de 3 entregas aparece como "Novo"
- 🔍 **"Por que minha reputação é X?"** (`/reputacao`): cada componente com barra e explicação, regras em vigor e dicas para melhorar ("comparecer às próximas 3 entregas recupera cerca de N pontos")
- 🚦 **Restrições automáticas**: na faixa Restrito, 1 entrega em aberto por vez e sem confirmação automática; **3 faltas em 30 dias bloqueiam novos agendamentos por 7 dias**, com aviso na 2ª falta e o prazo bem claro
- 🏅 **Selos**: Parceiro verificado, Responde rápido, Muito bem avaliado, Reciclador exemplar, Sempre comparece
- 🕵️ **Privacidade**: o ponto vê só a faixa e o número do cidadão ("Exemplar · 93"), nunca os detalhes. Ponto com média abaixo de 2,5 em 10+ avaliações entra em revisão da moderação

**Diferenciais**

- 🏆 **Gamificação** — EcoPontos por kg reciclado, níveis (Bronze→Platina), conquistas e **dashboard de impacto** (CO₂, água, energia, árvores)
- 🎁 **Loja de recompensas** — troque EcoPontos (saldo) por brindes e descontos de parceiros, com geração de **voucher**
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
| Cidadão    | `felipe@email.com`      | Reputação Regular: 2 faltas em 30 dias (mais uma bloqueia)         |
| Parceiro   | `marcos@email.com`      | Gestor do EcoPonto Centro e da Recicla Pinheiros; também é cidadão |
| Parceiro   | `paula@email.com`       | Operadora da Coleta Vila Madalena                                  |
| Parceiro   | `lucia@email.com`       | Gestora da ReciclaRio (CNPJ alfanumérico), com um ponto em análise |
| Parceiro   | `rafael@email.com`      | Organização recém-cadastrada, aguardando aprovação                 |
| Plataforma | `moderacao@ecolink.app` | Moderação (consulta usuários e auditoria)                          |
| Plataforma | `admin@ecolink.app`     | Administração (também suspende e reativa contas)                   |

> A senha de demonstração é conhecida e já fica guardada como hash. Contas criadas pelo cadastro seguem a política de senha (mínimo 8 caracteres, sem senhas óbvias).

### Modo demonstração (tela de login)

- **Entrar com um clique** em qualquer conta acima.
- **Simular rede**: normal, lenta ou instável (30% das chamadas falham), para mostrar os estados de carregando, erro e "tentar de novo".
- **Caixa de e-mail** (`/demo/emails`): onde chegam os códigos de recuperação de senha e os avisos de segurança.
- **Restaurar dados** de demonstração.

**Roteiro rápido para a banca** (duas janelas lado a lado):

1. Janela 1: **Ana** agenda uma entrega no EcoPonto Centro (vários materiais, escolhe a janela).
2. Janela 2: **Marcos** vê a solicitação chegar em "Novas" (com aviso) e aceita. Na janela 1 aparecem o código e o QR.
3. Entre como **Diego** (`diego@email.com`): ele tem uma entrega **hoje** no EcoPonto Centro. Mostre o código, e o Marcos faz o check-in, pesa e conclui. O comprovante e os EcoPontos aparecem para o Diego na hora.
4. No perfil da Ana, "Mostrar meu QR" → o Marcos usa "Ler QR / código" para registrar uma entrega sem agendamento.
5. Depois da pesagem, o Marcos **avalia o Diego**; o Diego vê a avaliação na hora e **avalia o ponto**. O Marcos responde pelo painel ("Avaliações recebidas → Sem resposta"), e a resposta aparece na página do EcoPonto Centro com o selo "entrega verificada".
6. Entre como **Felipe** (`felipe@email.com`): ele tem **2 faltas** e já vê o aviso. Em "Minha reputação", tudo é explicado.
7. Na tela de login, "Simular passagem do tempo" (+3 dias) mostra solicitações expirando e faltas sendo registradas: a 3ª falta do Felipe **bloqueia novos agendamentos por 7 dias**.

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
│   ├── arquivos.js          # fotos e documentos no IndexedDB
│   └── repos/               # "API": auth, usuarios, pontos, coletas, parceiro, admin…
├── hooks/                   # useQuery, useMutation, useDbVersion
├── features/
│   ├── auth/                # login, cadastro, recuperação de senha, painel demo
│   ├── cidadao/pages/       # área do cliente
│   ├── parceiro/pages/      # seja parceiro, cadastro da organização, assistente de ponto, painel
│   ├── admin/pages/         # usuários, aprovações e auditoria
│   └── shared/pages/        # chat, perfil (segurança), termos, caixa de e-mail demo
├── components/              # UI reutilizável, mapa, ícones
└── utils/                   # datas, formatação, geolocalização
```

Os testes ficam ao lado do código (`*.test.js`). O planejamento das próximas fases está em [`ROADMAP.md`](./ROADMAP.md).
