-- ECOLINK no Supabase — 4/4: DADOS DE REFERÊNCIA E RELÓGIO

-- Catálogo de materiais (o mesmo de src/domain/materiais.js): fator de EcoPontos por kg.
insert into public.materiais (slug, rotulo, fator) values
  ('papel', 'Papel', 8),
  ('papelão', 'Papelão', 7),
  ('plástico', 'Plástico', 10),
  ('vidro', 'Vidro', 6),
  ('metal', 'Metal', 12),
  ('eletrônicos', 'Eletrônicos', 20),
  ('pilhas', 'Pilhas', 25),
  ('óleo', 'Óleo de cozinha', 15),
  ('isopor', 'Isopor', 9),
  ('orgânico', 'Orgânico', 4)
on conflict (slug) do update set rotulo = excluded.rotulo, fator = excluded.fator;

-- Relógio: expira solicitações e registra faltas a cada minuto (pg_cron).
-- Sem pg_cron (ou sem permissão para ativá-lo), a instalação segue: os prazos só
-- deixam de correr sozinhos até ele ser ativado (Integrations → Cron no painel).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('ecolink-prazos', '* * * * *', 'select public.processar_prazos()');
  end if;
exception when others then
  raise notice 'pg_cron não foi ativado (%). Ative em Integrations → Cron e rode este bloco de novo.', sqlerrm;
end $$;
