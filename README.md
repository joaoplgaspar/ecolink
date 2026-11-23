# ♻️ ECOLINK — Front End

Front end (React + Vite) da plataforma **ECOLINK**, que conecta pessoas a **pontos de coleta** de recicláveis, permite **agendar coletas** e premia quem recicla com **gamificação** (EcoPontos, níveis, conquistas e ranking).

> Projeto Integrador. Espelha o domínio da API **reciclaja-api** (usuários, pontos de coleta e coletas) e adiciona, no front, as mecânicas prometidas no projeto.

---

## 🧩 Funcionalidades

**MVP (núcleo, fiel à API)**

- Login / cadastro de usuário (autenticação simbólica)
- **Mapa interativo** (Leaflet + OpenStreetMap) com **busca por endereço**, **"usar minha localização"** e pontos ordenados por **distância**; filtro por cidade e material
- Detalhe do ponto (materiais aceitos, horário, localização no mapa)
- Agendar coleta (material, quantidade em kg, data)
- Minhas coletas com status (**agendada → concluída → cancelada**)
- Perfil do usuário

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
- **Seed com datas relativas a hoje** (`src/data/seed.js`): 10 usuários, 8 pontos e cerca de 60 coletas nos últimos 60 dias. É determinístico: "Restaurar dados" sempre gera a mesma estrutura.

> Contas de teste: `ana@email.com`, `bruno@email.com`, `carla@email.com` (e mais 7) — senha **`senha123`**.
> No Perfil há um botão **"Restaurar dados de demonstração"** para zerar tudo.

**Simular rede lenta ou instável** (no console do navegador, depois recarregue):

```js
localStorage.setItem('ecolink:dev', JSON.stringify({ latenciaMin: 800, latenciaMax: 1500 })); // rede lenta
localStorage.setItem('ecolink:dev', JSON.stringify({ taxaFalha: 0.3 })); // 30% das chamadas falham
localStorage.removeItem('ecolink:dev'); // volta ao normal
```

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
├── domain/                  # REGRAS PURAS, sem React — gamificação, materiais, pontos
├── data/
│   ├── storage.js           # armazenamento: cache, transações, abas, recuperação
│   ├── migrations.js        # versões do formato dos dados
│   ├── seed.js              # dados de demonstração (relativos a hoje)
│   ├── config.js            # latência/falhas simuladas
│   ├── erros.js             # ErroApi (status no estilo HTTP)
│   └── repos/               # "API": usuarios, pontos, coletas, avaliacoes, resgates, chat…
├── hooks/                   # useQuery, useMutation, useDbVersion
├── features/
│   ├── auth/pages/          # login e cadastro
│   ├── cidadao/pages/       # área do cliente
│   └── shared/pages/        # chat e perfil
├── components/              # UI reutilizável, mapa, ícones
└── utils/                   # datas, formatação, geolocalização
```

Os testes ficam ao lado do código (`*.test.js`). O planejamento das próximas fases está em [`ROADMAP.md`](./ROADMAP.md).
