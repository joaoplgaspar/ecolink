# Roteiro de apresentação para a banca (≈ 10 minutos)

## Antes de começar (5 min de preparo)

1. `npm ci && npm run build && npx vite preview` (ou `npm run dev`) e abra `http://localhost:4173`.
2. Na tela de login, **Restaurar dados** (a demonstração volta ao estado conhecido).
3. Duas janelas lado a lado:
   - **Esquerda (celular emulado, DevTools → modo dispositivo):** Ana — `ana@email.com`.
   - **Direita (balcão):** Marcos, EcoPonto Centro — `marcos@email.com`.
   - Uma terceira aba minimizada: moderação — `moderacao@ecolink.app` (e `admin@ecolink.app` para o recurso).
   - Senha de todas as contas: `senha123`. Cada aba tem a própria sessão.
4. **Plano B:** o vídeo [`docs/video/ecolink-demo.webm`](./video/ecolink-demo.webm) (1min30, com legendas) mostra a jornada inteira. Ele é regravado com `npm run e2e:video`.

## Cenas

| Min  | Cena                                                                                                                                                                                             | O que a banca deve perceber                     |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| 0–1  | O problema: reciclar exige confiança dos dois lados. A analogia com um app de delivery: quem descarta × quem recebe                                                                              | Produto com dois lados                          |
| 1–2  | Ana abre o **EcoPonto Centro**: regras por material, horários, "aberto agora", reputação com selos e avaliações **verificadas**                                                                  | Informação para decidir                         |
| 2–3  | Ana agenda **papel + vidro** numa janela com vagas reais. **Na outra janela**, a solicitação chega na hora, com a reputação dela — e sem telefone ou e-mail                                      | Tempo real, minimização de dados                |
| 3–5  | Entre como **Diego** (`diego@email.com`): ele tem entrega **hoje**. Código errado é recusado; o certo abre a conferência. Marcos pesa e conclui                                                  | **Quem recebe é quem confirma** (antifraude D1) |
| 5–6  | Comprovante para os dois lados; **extrato** (livro-caixa); avaliação mútua                                                                                                                       | Contabilidade e reputação bilateral             |
| 6–7  | Aba **Estoque e destinação**: o plástico do Diego vai para a Cooperativa Recicla Juntos → na entrega do Diego aparece **"Para onde foi seu material"**                                           | Rastreabilidade de ponta a ponta                |
| 7–8  | **Elisa** (`elisa@email.com`) no chat do EcoPonto Botafogo: pedido de Pix com **aviso de golpe**. Ana denuncia a Coleta Vila Madalena → protocolo                                                | Segurança do usuário                            |
| 8–9  | **Moderação:** fila priorizada (grave e fora do prazo no topo), caso com sanção sugerida pela escala, decisão → **o ponto some do mapa**. Sérgio recorre; quem decidiu não pode julgar o recurso | Moderação justa e auditável                     |
| 9–10 | Encerramento: [arquitetura e diagramas](./arquitetura.md), [ADRs](./adr/), testes verdes no CI (unidade + E2E com axe), Lighthouse ≥ 95                                                          | Rigor técnico                                   |

## Se der tempo

- **Felipe** (`felipe@email.com`, 2 faltas) → "Simular passagem do tempo (+3 dias)" na tela de login → a 3ª falta **bloqueia** novos agendamentos; "Minha reputação" explica o porquê.
- **Contestação de pesagem** (Gabriela) ajustada pela administração → diferença no extrato.
- **Convite de equipe:** Marcos convida `joao@email.com`; o código chega na caixa de e-mail da demo (`/demo/emails`); João aceita em `/convite`.
- **LGPD:** Perfil → "Baixar meus dados" (JSON) e "Excluir minha conta" (anonimização).
- **Acessibilidade:** Tab mostra "Pular para o conteúdo"; o sistema respeita "reduzir movimento".

## Perguntas que a banca costuma fazer

- **"Isso tem servidor?"** — Ainda não: os dados ficam no navegador, mas atrás de repositórios que se comportam como uma API (latência, erros HTTP, sessão). A migração para o Supabase está descrita no roadmap §17 e no [ADR 0001](./adr/0001-dados-no-dispositivo-com-repositorios.md).
- **"E se o cidadão mentir o peso?"** — O peso que vale é o da balança do ponto; divergências grandes pedem confirmação e entram na reputação.
- **"E se o ponto for desonesto?"** — Contestação de pesagem, denúncia com escala de sanções, reputação pública e histórico do operador na tela da moderação.
- **"Como sabem que é acessível?"** — Teste automático com axe (WCAG 2.1 AA) em todas as telas principais no CI, teclado, leitor de tela (rótulos e regiões ao vivo) e Lighthouse 100 em acessibilidade.
