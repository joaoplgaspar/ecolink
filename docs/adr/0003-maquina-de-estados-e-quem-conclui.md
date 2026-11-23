# ADR 0003 — Máquina de estados da coleta; quem conclui é o ponto

**Situação:** aceita (Fase 3) — resolve o D1

## Contexto

O cidadão marcava a própria coleta como concluída e ganhava EcoPontos: fraude trivial.

## Decisão

- `domain/coletaMaquina.js` define estados, transições e **quem** pode cada uma (cidadão, ponto, sistema, moderação). Toda mudança vira um evento na linha do tempo.
- Só o ponto conclui, depois do **check-in com o código de entrega** (4 dígitos + QR, só o cidadão vê) e da **pesagem por item**. Os EcoPontos saem do peso aferido.

## Consequências

- Não existe caminho para o cidadão gerar os próprios pontos.
- Prazos (expiração, não comparecimento, lembretes) são transições do "sistema", disparadas pelo relógio (`manutencao.js`; no Supabase, pg_cron).
