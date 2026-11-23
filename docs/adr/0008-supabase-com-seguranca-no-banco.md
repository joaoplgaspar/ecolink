# ADR 0008 — Supabase com a segurança no banco, e os dois modos no mesmo app

**Situação:** aceita (migração para o Supabase, etapa 1)

## Contexto

Até a Fase 7, as regras e permissões rodavam nos repositórios, no navegador ([ADR 0001](./0001-dados-no-dispositivo-com-repositorios.md), [ADR 0002](./0002-regras-na-camada-de-dados.md)). Isso demonstra o desenho, mas não é segurança real: qualquer pessoa pode abrir o console. No Supabase, a chave pública (`anon`) vai para o navegador — então **o banco precisa se defender sozinho**. Ao mesmo tempo, o modo local continua valioso: demonstração offline, testes rápidos e plano B na apresentação.

## Decisão

1. **A segurança mora no Postgres.** RLS em todas as tabelas; `insert/update/delete` revogados das funções da API; escrita só por funções `security definer` que conferem `auth.uid()` e aplicam a máquina de estados. Privilégios por coluna onde a linha é da pessoa (perfil: nome sim, papéis nunca). `execute` revogado por padrão (o Supabase libera para `anon`).
2. **Minimização pelo desenho das tabelas**: o código de entrega fica numa tabela que só o dono lê; a equipe do ponto não lê a tabela de entregas e recebe "Ana R." pelas funções; avaliações públicas sem a coluna do autor.
3. **Os dois modos no mesmo app, escolhidos no build** (`VITE_FONTE_DADOS`). Um plugin do Vite troca `src/data/<x>` por `src/data/supabase/<x>`; as telas não mudam. Cada repositório Supabase começa com `export * from 'fonte:nao-migrado/<repo>'` — um módulo virtual com as **mesmas exportações** do local, respondendo 501 — e sobrescreve o que já migrou.
4. **Mesmo seed nos dois modos**: `supabase/seed.sql` é gerado de `src/data/seed.js`, com datas relativas ao dia em que roda.
5. **Telas atualizadas por consulta periódica** (10 s e após cada ação), em vez de Realtime, nesta etapa.

## Consequências

- O que o modo local demonstrava passa a ser **verdade**: 61 testes pgTAP entram como cada pessoa e provam, no banco, que ninguém lança EcoPontos, se promove a admin, lê a entrega dos outros ou opera a própria entrega.
- As fórmulas do domínio (agenda, reputação, gamificação) continuam em JavaScript e valem nos dois modos; as regras que **protegem** (permissões, transições, créditos) foram reescritas em SQL. Há duas implementações das transições da coleta — os testes dos dois lados (Vitest e pgTAP) mantêm as duas alinhadas.
- A migração é incremental e visível: cada área ainda não migrada responde 501 com mensagem clara, sem quebrar o resto, e o bundle de cada modo leva só a sua fonte de dados.
- Restrições de reputação (bloqueio por faltas, aceite automático restrito) e penalidades da moderação ainda não são aplicadas pelo servidor; entram com a migração de avaliações e moderação.
