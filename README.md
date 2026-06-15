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

## 🗃️ Dados (mock)

Para rodar em qualquer máquina **sem depender da API**, todos os dados são **simulados no navegador** (`localStorage`).
O seed inicial (`src/data/seed.js`) reproduz os dados da `reciclaja-api` (Ana, Bruno, Carla; EcoPonto Centro, Vila Madalena, ReciclaRio…) e adiciona alguns extras.

O módulo `src/store/db.js` imita o comportamento da API (CRUD de usuários, pontos e coletas). Para plugar na API real no futuro, basta substituir as funções desse arquivo por chamadas `fetch` ao back end — o restante do app não muda.

> Contas de teste: `ana@email.com`, `bruno@email.com`, `carla@email.com` — senha **`senha123`**.
> No Perfil há um botão **"Restaurar dados de demonstração"** para zerar tudo.

---

## 🚀 Como rodar

> Pré-requisito: **Node.js 18+**.

```bash
npm install     # instala as dependências
npm run dev     # sobe em http://localhost:5173
```

Build de produção: `npm run build` e depois `npm run preview`.

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
├── main.jsx / App.jsx        # entrada + rotas
├── index.css                 # tema (paleta "eco")
├── context/AuthContext.jsx   # login/sessão
├── data/seed.js              # dados iniciais (espelham a API)
├── store/
│   ├── db.js                 # "banco" mock (CRUD) em localStorage
│   └── gamification.js        # EcoPontos, níveis, conquistas, impacto
├── hooks/useDbVersion.js     # reatividade do store
├── components/               # Layout, MapView, NotificationBell, icons, ui
└── pages/                    # Login, Dashboard, Points, Chat, Ranking...
```
