# ADR 0006 — Estoque derivado e rastreabilidade FIFO

**Situação:** aceita (Fase 6)

## Contexto

Para a banca, o argumento ambiental depende de provar para onde o material vai. Um estoque "digitado" seria só um número.

## Decisão

- Estoque = itens **pesados e aprovados** − **destinações**. Nunca é editado à mão.
- Cada destinação consome primeiro os lotes mais antigos (FIFO, no fuso local), o que permite dizer a cada cidadão para onde foi o material dele.
- Capacidade por material: alerta em 90%; em 100% o material sai do agendamento (o que já está agendado conta como reservado).

## Consequências

- Rastreabilidade de ponta a ponta: cidadão → ponto → destino final, com aviso ao cidadão.
