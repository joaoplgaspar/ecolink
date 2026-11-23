-- Testes do banco (pgTAP): RLS, privilégios e as funções da jornada.
-- Rodam DENTRO de uma transação desfeita no fim (rollback): o banco fica intacto.
--
--   npm run test:banco          (Postgres de teste em Docker; ver scripts/testar-banco.sh)
--   supabase test db            (com o Supabase CLI e `supabase start`)
--
-- Pressupõe o seed (supabase/seed.sql). Contas usadas (uuid …0000000000NN):
--   01 Ana (cidadã)   02 Bruno (cidadão)   04 Diego (cidadão, entrega HOJE no ponto 1)
--   11 Marcos (gestor dos pontos 1 e 4, também cidadão)   12 Paula (operadora do ponto 2)
--   15 Sérgio (gestor dos pontos 2 e 7)   14 admin
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(56);

-- --------------------------------------------------------------- ajudantes --

create function pg_temp.u(n int) returns uuid language sql immutable as
  $$ select ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid $$;

-- Entra como a conta n (como o PostgREST faz com o JWT). Volta com `reset role`.
create function pg_temp.como(n int) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', pg_temp.u(n), 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;
create function pg_temp.anonimo() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"anon"}', true);
  select set_config('role', 'anon', true);
$$;

-- Primeira janela livre (data, início) de um ponto, pelas MESMAS regras do servidor.
create function pg_temp.janela_livre(p_ponto bigint, out dia date, out inicio text) language plpgsql as $$
declare p public.pontos; i jsonb; t int;
begin
  select * into p from public.pontos where id = p_ponto;
  for dia in select generate_series(privado.hoje_local() + 1, privado.hoje_local() + 10, interval '1 day')::date loop
    for i in select * from jsonb_array_elements(privado.intervalos_do_dia(p, dia)) loop
      t := split_part(i ->> 'abre', ':', 1)::int * 60 + split_part(i ->> 'abre', ':', 2)::int;
      while t + 30 <= split_part(i ->> 'fecha', ':', 1)::int * 60 + split_part(i ->> 'fecha', ':', 2)::int loop
        inicio := lpad((t / 60)::text, 2, '0') || ':' || lpad((t % 60)::text, 2, '0');
        if privado.problema_da_janela(p, dia, inicio) is null then return; end if;
        t := t + 30;
      end loop;
    end loop;
  end loop;
  raise exception 'sem janela livre no ponto %', p_ponto;
end $$;

create temp table t (chave text primary key, valor text);
grant all on t to anon, authenticated;

-- Itens declarados da entrega 56 (Diego, hoje, ponto 1) e um material que o ponto 1 NÃO aceita.
insert into t values
  ('itens56', (select jsonb_agg(jsonb_build_object('material', i ->> 'material', 'status', 'aprovado',
                                                   'kg_aferido', (i ->> 'kg_declarado')::numeric))
               from public.coletas, jsonb_array_elements(itens) i where id = 56)),
  ('itens56_10x', (select jsonb_agg(jsonb_build_object('material', i ->> 'material', 'status', 'aprovado',
                                                   'kg_aferido', (i ->> 'kg_declarado')::numeric * 10 + 5))
               from public.coletas, jsonb_array_elements(itens) i where id = 56)),
  ('nao_aceito', (select m.slug from public.materiais m, public.pontos p
                  where p.id = 1 and not (m.slug = any (p.materiais)) limit 1)),
  ('janela1', (select to_jsonb(j) from pg_temp.janela_livre(1) j)::text),
  ('saldo_diego', (select coalesce(sum(valor), 0) from public.extrato where usuario_id = pg_temp.u(4))::text);

-- Uma entrega do próprio Marcos no ponto que ele gere (inserida por fora das regras,
-- só para provar que a função recusa a autoatuação) e outra de hoje para o bloqueio.
insert into public.coletas (id, codigo, usuario_id, ponto_id, data, janela_inicio, janela_fim, itens, status)
values (9001, 'ECO-TESTE', pg_temp.u(11), 4, privado.hoje_local() + 3, '10:00', '10:30', '[]', 'solicitada'),
       (9002, 'ECO-TESTF', pg_temp.u(2), 1, privado.hoje_local(), '10:00', '10:30', '[]', 'confirmada'),
       (9003, 'ECO-TESTG', pg_temp.u(2), 1, privado.hoje_local() - 1, '10:00', '10:30', '[]', 'confirmada');
insert into public.coleta_codigos (coleta_id, codigo_entrega) values (9002, '1111'), (9003, '2222');

-- ============================================== 1. estrutura e privilégios --

select is((select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity), 0,
  'RLS ligada em TODAS as tabelas públicas');
select is((select count(*)::int from information_schema.role_table_grants
           where table_schema = 'public' and grantee in ('anon', 'authenticated')
             and privilege_type in ('INSERT', 'DELETE', 'TRUNCATE')), 0,
  'ninguém da API insere ou apaga linhas diretamente');
select is((select array_agg(distinct table_name::text order by table_name::text) from information_schema.column_privileges
           where table_schema = 'public' and grantee = 'authenticated' and privilege_type = 'UPDATE'),
  array['notificacoes', 'perfis'],
  'UPDATE direto só em colunas de perfis e notificações');
select is((select array_agg(column_name::text order by column_name::text) from information_schema.column_privileges
           where table_schema = 'public' and table_name = 'perfis' and grantee = 'authenticated' and privilege_type = 'UPDATE'),
  array['boas_vindas', 'cidade', 'nome', 'telefone'],
  'no perfil, só nome/telefone/cidade/boas-vindas são editáveis (papéis e status, nunca)');
select ok(not has_function_privilege('authenticated', 'public.processar_prazos()', 'execute'),
  'o relógio (processar_prazos) não é chamável pelo navegador');
select ok(not has_function_privilege('authenticated', 'privado.notificar(uuid, text, text, text, text)', 'execute'),
  'ajudantes de escrita do esquema privado não são chamáveis');
select ok(not has_function_privilege('anon', 'public.solicitar_coleta(bigint, date, text, jsonb)', 'execute'),
  'visitante (anon) não agenda entregas');

-- ================================================================ 2. anon --

select pg_temp.anonimo();
select is((select count(*)::int from public.coletas), 0, 'anon: não vê entregas');
select is((select count(*)::int from public.perfis), 0, 'anon: não vê perfis');
select is((select count(*)::int from public.pontos), 8, 'anon: vê só os pontos ativos/pausados do mapa');
select ok((select count(*) from public.avaliacoes) > 0, 'anon: lê avaliações públicas…');
select throws_ok('select usuario_id from public.avaliacoes', '42501', null,
  '…mas não descobre QUEM avaliou (sem usuario_id)');
select ok((select count(*) from public.agenda_ocupacao(1, current_date, current_date + 14)) >= 0,
  'anon: consulta a ocupação da agenda (sem dados pessoais)');
reset role;

-- ============================================================ 3. cidadã Ana --

select pg_temp.como(1);
select is((select count(*)::int from public.coletas where usuario_id <> pg_temp.u(1)), 0,
  'Ana não vê entregas de outras pessoas');
select ok((select count(*) from public.coletas) > 0, 'Ana vê as próprias entregas');
select is((select count(*)::int from public.perfis), 1, 'Ana só lê o próprio perfil');
select is((select array_agg(coleta_id) from public.coleta_codigos), array[60::bigint],
  'Ana lê o código de entrega só da entrega dela');
select throws_ok($$ insert into public.extrato (usuario_id, tipo, valor) values (pg_temp.u(1), 'bonus', 1000) $$,
  '42501', null, 'Ana NÃO lança EcoPontos no próprio extrato');
select throws_ok($$ update public.perfis set papeis = '{cidadao,admin}' where id = pg_temp.u(1) $$,
  '42501', null, 'Ana NÃO se promove a admin');
select throws_ok($$ update public.coletas set status = 'concluida' where id = 60 $$,
  '42501', null, 'Ana NÃO conclui a própria entrega');
select lives_ok($$ update public.perfis set nome = 'Ana Ribeiro Lima' where id = pg_temp.u(1) $$,
  'Ana edita o próprio nome');
select throws_ok($$ update public.notificacoes set texto = 'x' $$, '42501', null,
  'Ana não reescreve notificações (só marca como lida)');
select throws_ok($$ select public.trocar_perfil('admin') $$, 'PT403', null,
  'Ana não entra no perfil Plataforma');
select throws_ok($$ select public.cancelar_coleta(61, '') $$, 'PT403', null,
  'Ana não cancela a entrega do Bruno');
select throws_ok(format($$ select public.solicitar_coleta(1, %L, %L, '[{"material":"%s","kg":2}]') $$,
    (select valor::jsonb ->> 'dia' from t where chave = 'janela1'), (select valor::jsonb ->> 'inicio' from t where chave = 'janela1'),
    (select valor from t where chave = 'nao_aceito')),
  'PT422', null, 'agendamento recusa material que o ponto não aceita');
select throws_ok(format($$ select public.solicitar_coleta(1, %L, '03:17', '[{"material":"papel","kg":2}]') $$,
    (select valor::jsonb ->> 'dia' from t where chave = 'janela1')),
  'PT422', null, 'agendamento recusa horário fora da agenda do ponto');

-- Agenda de verdade: Ana tem 2 em aberto; esta é a 3ª.
insert into t select 'nova', public.solicitar_coleta(1,
  (select valor::jsonb ->> 'dia' from t where chave = 'janela1')::date, (select valor::jsonb ->> 'inicio' from t where chave = 'janela1'),
  jsonb_build_array(jsonb_build_object('material', (select materiais[1] from public.pontos where id = 1), 'kg', 3)))::text;
select is((select status from public.coletas where id = (select valor::bigint from t where chave = 'nova')), 'solicitada',
  'Ana agenda uma entrega (fica "solicitada")');
select throws_ok(format($$ select public.solicitar_coleta(1, %L, %L, '[{"material":"%s","kg":2}]') $$,
    (select valor::jsonb ->> 'dia' from t where chave = 'janela1'), (select valor::jsonb ->> 'inicio' from t where chave = 'janela1'),
    (select materiais[1] from public.pontos where id = 1)),
  'PT429', null, 'no máximo 3 entregas em aberto (antispam)');
select throws_ok(format($$ select public.aceitar_coleta(%s) $$, (select valor from t where chave = 'nova')), 'PT404', null,
  'Ana não aceita a própria solicitação');
reset role;

-- ====================================================== 4. equipe do ponto --

select pg_temp.como(11); -- Marcos, gestor do ponto 1
select is((select count(*)::int from public.coletas where usuario_id <> pg_temp.u(11)), 0,
  'a equipe não lê a tabela de entregas (só pelas funções, sem o id do cidadão)');
select ok((select bool_and(not (r ? 'usuario_id')) from jsonb_array_elements(public.recebimentos_do_ponto(1)) r),
  'recebimentos do ponto vêm SEM o id do cidadão');
select ok((select bool_and(r ->> 'cidadao' ~ '^\S+( \S\.)?$') from jsonb_array_elements(public.recebimentos_do_ponto(1)) r),
  '…e com o nome reduzido ("Ana R.")');
select throws_ok('select public.recebimentos_do_ponto(2)', 'PT403', null, 'Marcos não vê os recebimentos de outro ponto');
select is((select count(*)::int from public.coleta_codigos), 0, 'a equipe NUNCA lê o código de entrega');
select throws_ok(format($$ select public.solicitar_coleta(1, %L, %L, '[{"material":"papel","kg":2}]') $$,
    (select valor::jsonb ->> 'dia' from t where chave = 'janela1'), (select valor::jsonb ->> 'inicio' from t where chave = 'janela1')),
  'PT403', null, 'conflito de interesse: Marcos não agenda no ponto em que trabalha');
select throws_ok('select public.aceitar_coleta(9001)', 'PT403', null, 'ninguém opera a PRÓPRIA entrega');
select lives_ok(format('select public.aceitar_coleta(%s)', (select valor from t where chave = 'nova')),
  'Marcos aceita a solicitação da Ana');
select throws_ok(format('select public.aceitar_coleta(%s)', (select valor from t where chave = 'nova')), 'PT409', null,
  'aceitar duas vezes dá conflito');
reset role;

select pg_temp.como(1);
select is((select codigo_entrega ~ '^[0-9]{4}$' from public.coleta_codigos where coleta_id = (select valor::bigint from t where chave = 'nova')),
  true, 'aceita, a Ana recebe o código de entrega de 4 dígitos');
reset role;

select pg_temp.como(15); -- Sérgio, gestor do ponto 2
select throws_ok('select public.checkin_coleta(56, ''3925'')', 'PT404', null,
  'Sérgio não faz check-in em entrega de outro ponto');
reset role;

-- ======================================== 5. check-in, bloqueio e pesagem --

select pg_temp.como(11);
select is(public.checkin_coleta(56, '0000') ->> 'ok', 'false', 'código errado é recusado…');
reset role;
select is((select tentativas from public.coleta_codigos where coleta_id = 56), 1,
  '…e a tentativa fica registrada (a função não desfaz a contagem)');

select pg_temp.como(11);
select public.checkin_coleta(9002, '0000') from generate_series(1, 5);
select throws_ok('select public.checkin_coleta(9002, ''1111'')', 'PT429', null,
  '5 códigos errados bloqueiam o check-in por 10 minutos (até com o código certo)');
select throws_ok('select public.checkin_coleta(9003, ''2222'')', 'PT409', null, 'check-in só vale no dia da entrega');
select is(public.checkin_coleta(56, '3925') ->> 'ok', 'true', 'código certo: check-in feito');
select is((select r ->> 'codigo' from public.registrar_pesagem(56, (select valor::jsonb from t where chave = 'itens56_10x')) r),
  'divergencia', 'peso muito acima do declarado pede confirmação');
reset role;

select pg_temp.como(4); -- Diego, o dono da entrega
select throws_ok(format($$ select public.registrar_pesagem(56, %L) $$, (select valor from t where chave = 'itens56')),
  'PT404', null, 'o cidadão NÃO pesa a própria entrega (EcoPontos vêm da balança do ponto)');
reset role;

select pg_temp.como(11);
select is((select r ->> 'ok' from public.registrar_pesagem(56, (select valor::jsonb from t where chave = 'itens56')) r),
  'true', 'Marcos registra a pesagem');
select throws_ok(format($$ select public.registrar_pesagem(56, %L) $$, (select valor from t where chave = 'itens56')),
  'PT409', null, 'pesar duas vezes dá conflito (sem crédito em dobro)');
reset role;

select is((select status from public.coletas where id = 56), 'concluida', 'entrega concluída');
select is((select sum(valor)::int from public.extrato where usuario_id = pg_temp.u(4)) - (select valor::int from t where chave = 'saldo_diego'),
  (select pontos_creditados from public.coletas where id = 56),
  'o crédito no extrato é exatamente o do comprovante');
select ok((select pontos_creditados from public.coletas where id = 56) > 0, 'e é maior que zero (kg × fator do material)');
select is((select count(*)::int from public.coleta_eventos where coleta_id = 56 and acao in ('checkin', 'concluir')), 2,
  'cada transição vira um evento na linha do tempo');

-- ================================================== 6. conta nova e relógio --

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', pg_temp.u(999), 'authenticated', 'authenticated', 'malicioso@teste.com', '',
        '{"nome":"Tentativa","papeis":["admin"]}', now(), now());
select is((select papeis from public.perfis where id = pg_temp.u(999)), array['cidadao'],
  'cadastro sempre cria CIDADÃO (papéis enviados no cadastro são ignorados)');

select is((public.processar_prazos() ->> 'nao_compareceu')::int >= 1, true, 'o relógio marca "não compareceu" no dia seguinte…');
select is((select status from public.coletas where id = 9003), 'nao_compareceu', '…e o código de entrega deixa de valer');

select * from finish();
rollback;
