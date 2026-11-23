# ADR 0005 — Reputação com fórmula explícita e média bayesiana

**Situação:** aceita (Fase 4) — resolve o D7

## Contexto

Avaliações sem lastro e notas opacas não geram confiança — e uma única nota ruim não pode destruir ninguém.

## Decisão

- Reputação de 0 a 100 como **soma de componentes com pesos públicos** (comparecimento, peso declarado × balança, material conforme, avaliações, perfil, histórico).
- **Média bayesiana** (começa de uma opinião neutra); "Novo" nas 3 primeiras entregas.
- Avaliações **verificadas**: só quem teve a entrega conferida avalia, uma por entrega, nos dois sentidos.
- Tela "Por que minha reputação é X?" mostra cada componente e dicas com ganho estimado.

## Consequências

- Restrições automáticas são previsíveis e explicadas (3 faltas em 30 dias = 7 dias sem agendar).
- O ponto vê só a faixa e o número do cidadão (minimização).
