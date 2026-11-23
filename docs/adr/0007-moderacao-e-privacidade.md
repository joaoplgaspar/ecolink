# ADR 0007 — Moderação proporcional e exclusão de conta por anonimização

**Situação:** aceita (Fases 5 e 7) — resolve o D8

## Contexto

Denúncias exigem rapidez, mas também justiça e proteção de quem denuncia. A LGPD garante a exclusão, mas a contabilidade e os outros usuários dependem de parte do histórico.

## Decisão

- Moderação: fila priorizada; **sanção sugerida por escala pública**; justificativa obrigatória; fugir da escala é auditado; banimento só pela administração; **recurso julgado por outra pessoa**; o denunciado nunca sabe quem denunciou.
- Conta suspensa entra em modo restrito (continua podendo recorrer).
- Excluir conta = **anonimizar**: dados pessoais, mensagens e comentários saem; extrato, pesagens e notas agregadas ficam sem identificação. Exige senha + "EXCLUIR". Exportar dados entrega um JSON sem segredos.

## Consequências

- Cada decisão é explicável e contestável; os números da plataforma continuam consistentes após exclusões.
