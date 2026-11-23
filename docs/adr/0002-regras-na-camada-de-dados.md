# ADR 0002 — Regras e permissões na camada de dados

**Situação:** aceita (Fase 1)

## Contexto

No código original, regras importantes (saldo da loja, quem conclui a coleta) estavam só na tela — qualquer pessoa com o DevTools contornava.

## Decisão

- Uma única fonte de regras: `domain/permissoes.js` com `pode(ator, ação, recurso)`, função pura.
- Os repositórios **bloqueiam** (403, auditado); as telas usam a mesma função só para **esconder** botões.
- Conflito de interesse é regra: ninguém agenda no próprio ponto, opera a própria entrega ou modera um caso em que é parte.

## Consequências

- Toda regra é testável sem navegador (matriz de permissões nos testes).
- A matriz vira diretamente as _policies_ de RLS no Supabase.
