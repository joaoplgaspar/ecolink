# ADR 0001 — Dados no dispositivo, atrás de repositórios assíncronos

**Situação:** aceita (Fase 0)

## Contexto

O projeto ainda não tem banco de dados real, mas precisa se comportar como um produto com servidor: erros de rede, permissões, várias pessoas usando ao mesmo tempo. O plano é migrar para o Supabase depois.

## Decisão

- Os dados ficam no `localStorage`, com **transação atômica**, **migrações versionadas** e **sincronização entre abas**.
- As telas só falam com `src/data/repos/`, que devolvem `Promise`s, simulam latência e falha e lançam `ErroApi` com status HTTP.
- O usuário de cada chamada vem da **sessão** (`chamarAutenticado` → `ator`), nunca de um id vindo da tela.

## Consequências

- A demonstração funciona offline e dá para mostrar duas pessoas em duas abas, em tempo real.
- Migrar para o Supabase é reimplementar a pasta de repositórios; as telas e o domínio não mudam.
- O "servidor" roda no navegador: é uma simulação honesta, não segurança real. Na migração, as mesmas regras viram RLS e funções no Postgres (roadmap §17).
