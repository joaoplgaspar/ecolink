# ADR 0004 — Extrato de EcoPontos como livro-caixa

**Situação:** aceita (Fase 3)

## Contexto

O saldo era recalculado a partir das coletas; não havia como explicar ajustes nem estornos.

## Decisão

- `extrato` é **só de inclusão**: crédito de coleta, resgate, ajuste da moderação, estorno. Nenhum lançamento é editado ou apagado.
- Saldo = soma dos lançamentos; nível e ranking usam o acumulado de ganhos.
- Ajustes (contestação de pesagem) entram como um lançamento **novo** com a diferença.

## Consequências

- Todo número é auditável. Ao excluir uma conta (LGPD), o extrato fica, sem identificar a pessoa.
