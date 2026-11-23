-- GERADO por scripts/gerar-seed-supabase.mjs: APAGA todos os dados e contas do projeto e recria a
-- demonstração (mesmo seed do modo local). Use SÓ num projeto de demonstração.
-- Pode rodar de novo quando quiser "restaurar dados" (ex.: na manhã da apresentação: as datas
-- são relativas ao dia em que roda, então a entrega do Diego volta a ser HOJE).
begin;
truncate public.auditoria, public.notificacoes, public.avaliacoes, public.resgates, public.extrato,
  public.coleta_eventos, public.coleta_codigos, public.coletas, public.membros, public.pontos,
  public.organizacoes, public.recompensas restart identity cascade;
delete from auth.users; -- leva junto perfis e identidades
commit;

-- GERADO por scripts/gerar-seed-supabase.mjs a partir de src/data/seed.js. Não edite à mão.
-- Senha de todas as contas: senha123. Datas relativas ao dia em que o seed roda.
begin;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'ana@email.com',
  extensions.crypt('senha123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
  '{"nome":"Ana Recicladora"}'::jsonb, now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '{"sub":"00000000-0000-4000-8000-000000000001","email":"ana@email.com","email_verified":true}'::jsonb, 'email', now(), now(), now());
update public.perfis set papeis = array['cidadao']::text[], telefone = '11999990001', cidade = 'São Paulo',
  codigo_pessoal = 'SFSQP6B2', boas_vindas = '{"cidadao":"2026-08-20","parceiro":"2026-08-20","admin":"2026-08-20"}'::jsonb, aceite_termos = '{"versao":1,"em":"2026-08-20T09:00:00.000Z"}'::jsonb,
  criado_em = (now() + interval '-138064 minutes') where id = '00000000-0000-4000-8000-000000000001';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'bruno@email.com',
  extensions.crypt('senha123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
  '{"nome":"Bruno Verde"}'::jsonb, now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', '{"sub":"00000000-0000-4000-8000-000000000002","email":"bruno@email.com","email_verified":true}'::jsonb, 'email', now(), now(), now());
update public.perfis set papeis = array['cidadao']::text[], telefone = '11999990002', cidade = 'São Paulo',
  codigo_pessoal = 'KZU4TLM2', boas_vindas = '{"cidadao":"2026-08-22","parceiro":"2026-08-22","admin":"2026-08-22"}'::jsonb, aceite_termos = '{"versao":1,"em":"2026-08-22T09:00:00.000Z"}'::jsonb,
  criado_em = (now() + interval '-135184 minutes') where id = '00000000-0000-4000-8000-000000000002';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'carla@email.com',
  extensions.crypt('senha123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
  '{"nome":"Carla Eco"}'::jsonb, now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003', '{"sub":"00000000-0000-4000-8000-000000000003","email":"carla@email.com","email_verified":true}'::jsonb, 'email', now(), now(), now());
update public.perfis set papeis = array['cidadao']::text[], telefone = '21999990003', cidade = 'Rio de Janeiro',
  codigo_pessoal = '5H6SZ98S', boas_vindas = '{"cidadao":"2026-08-25","parceiro":"2026-08-25","admin":"2026-08-25"}'::jsonb, aceite_termos = '{"versao":1,"em":"2026-08-25T09:00:00.000Z"}'::jsonb,
  criado_em = (now() + interval '-130864 minutes') where id = '00000000-0000-4000-8000-000000000003';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'diego@email.com',
  extensions.crypt('senha123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
  '{"nome":"Diego Sustentável"}'::jsonb, now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000004', '{"sub":"00000000-0000-4000-8000-000000000004","email":"diego@email.com","email_verified":true}'::jsonb, 'email', now(), now(), now());
update public.perfis set papeis = array['cidadao']::text[], telefone = '11999990004', cidade = 'São Paulo',
  codigo_pessoal = '7DLSED4D', boas_vindas = '{"cidadao":"2026-09-04","parceiro":"2026-09-04","admin":"2026-09-04"}'::jsonb, aceite_termos = '{"versao":1,"em":"2026-09-04T09:00:00.000Z"}'::jsonb,
  criado_em = (now() + interval '-116464 minutes') where id = '00000000-0000-4000-8000-000000000004';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'elisa@email.com',
  extensions.crypt('senha123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
  '{"nome":"Elisa Natureza"}'::jsonb, now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000005', '{"sub":"00000000-0000-4000-8000-000000000005","email":"elisa@email.com","email_verified":true}'::jsonb, 'email', now(), now(), now());
update public.perfis set papeis = array['cidadao']::text[], telefone = '21999990005', cidade = 'Rio de Janeiro',
  codigo_pessoal = 'UG8YGEPZ', boas_vindas = '{"cidadao":"2026-09-09","parceiro":"2026-09-09","admin":"2026-09-09"}'::jsonb, aceite_termos = '{"versao":1,"em":"2026-09-09T09:00:00.000Z"}'::jsonb,
  criado_em = (now() + interval '-109264 minutes') where id = '00000000-0000-4000-8000-000000000005';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'felipe@email.com',
  extensions.crypt('senha123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
  '{"nome":"Felipe Reuso"}'::jsonb, now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000006', '{"sub":"00000000-0000-4000-8000-000000000006","email":"felipe@email.com","email_verified":true}'::jsonb, 'email', now(), now(), now());
update public.perfis set papeis = array['cidadao']::text[], telefone = '11999990006', cidade = 'São Paulo',
  codigo_pessoal = 'F74376NK', boas_vindas = '{"cidadao":"2026-09-14","parceiro":"2026-09-14","admin":"2026-09-14"}'::jsonb, aceite_termos = '{"versao":1,"em":"2026-09-14T09:00:00.000Z"}'::jsonb,
  criado_em = (now() + interval '-102064 minutes') where id = '00000000-0000-4000-8000-000000000006';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'gabriela@email.com',
  extensions.crypt('senha123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
  '{"nome":"Gabriela Terra"}'::jsonb, now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000007', '{"sub":"00000000-0000-4000-8000-000000000007","email":"gabriela@email.com","email_verified":true}'::jsonb, 'email', now(), now(), now());
update public.perfis set papeis = array['cidadao']::text[], telefone = '11999990007', cidade = 'São Paulo',
  codigo_pessoal = 'NBSPJJBV', boas_vindas = '{"cidadao":"2026-09-16","parceiro":"2026-09-16","admin":"2026-09-16"}'::jsonb, aceite_termos = '{"versao":1,"em":"2026-09-16T09:00:00.000Z"}'::jsonb,
  criado_em = (now() + interval '-99184 minutes') where id = '00000000-0000-4000-8000-000000000007';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'henrique@email.com',
  extensions.crypt('senha123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
  '{"nome":"Henrique Ciclo"}'::jsonb, now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000008', '{"sub":"00000000-0000-4000-8000-000000000008","email":"henrique@email.com","email_verified":true}'::jsonb, 'email', now(), now(), now());
update public.perfis set papeis = array['cidadao']::text[], telefone = '19999990008', cidade = 'Campinas',
  codigo_pessoal = '3MZXY5WA', boas_vindas = '{"cidadao":"2026-09-18","parceiro":"2026-09-18","admin":"2026-09-18"}'::jsonb, aceite_termos = '{"versao":1,"em":"2026-09-18T09:00:00.000Z"}'::jsonb,
  criado_em = (now() + interval '-96304 minutes') where id = '00000000-0000-4000-8000-000000000008';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000009', 'authenticated', 'authenticated', 'isabela@email.com',
  extensions.crypt('senha123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
  '{"nome":"Isabela Mar"}'::jsonb, now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000009', '{"sub":"00000000-0000-4000-8000-000000000009","email":"isabela@email.com","email_verified":true}'::jsonb, 'email', now(), now(), now());
update public.perfis set papeis = array['cidadao']::text[], telefone = '21999990009', cidade = 'Rio de Janeiro',
  codigo_pessoal = 'UP9T6HAC', boas_vindas = '{"cidadao":"2026-10-14","parceiro":"2026-10-14","admin":"2026-10-14"}'::jsonb, aceite_termos = '{"versao":1,"em":"2026-10-14T09:00:00.000Z"}'::jsonb,
  criado_em = (now() + interval '-58864 minutes') where id = '00000000-0000-4000-8000-000000000009';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000010', 'authenticated', 'authenticated', 'joao@email.com',
  extensions.crypt('senha123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
  '{"nome":"João Semente"}'::jsonb, now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000010', '{"sub":"00000000-0000-4000-8000-000000000010","email":"joao@email.com","email_verified":true}'::jsonb, 'email', now(), now(), now());
update public.perfis set papeis = array['cidadao']::text[], telefone = '11999990010', cidade = 'São Paulo',
  codigo_pessoal = 'SSCDD8RF', boas_vindas = '{"cidadao":"2026-11-03","parceiro":"2026-11-03","admin":"2026-11-03"}'::jsonb, aceite_termos = '{"versao":1,"em":"2026-11-03T09:00:00.000Z"}'::jsonb,
  criado_em = (now() + interval '-30064 minutes') where id = '00000000-0000-4000-8000-000000000010';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'marcos@email.com',
  extensions.crypt('senha123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
  '{"nome":"Marcos Lima"}'::jsonb, now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000011', '{"sub":"00000000-0000-4000-8000-000000000011","email":"marcos@email.com","email_verified":true}'::jsonb, 'email', now(), now(), now());
update public.perfis set papeis = array['parceiro_gestor', 'cidadao']::text[], telefone = '11999990011', cidade = 'São Paulo',
  codigo_pessoal = '7YJ7WHPF', boas_vindas = '{"cidadao":"2026-07-26","parceiro":"2026-07-26","admin":"2026-07-26"}'::jsonb, aceite_termos = '{"versao":1,"em":"2026-07-26T09:00:00.000Z"}'::jsonb,
  criado_em = (now() + interval '-174064 minutes') where id = '00000000-0000-4000-8000-000000000011';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'paula@email.com',
  extensions.crypt('senha123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
  '{"nome":"Paula Santos"}'::jsonb, now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000012', '{"sub":"00000000-0000-4000-8000-000000000012","email":"paula@email.com","email_verified":true}'::jsonb, 'email', now(), now(), now());
update public.perfis set papeis = array['parceiro_operador']::text[], telefone = '11999990012', cidade = 'São Paulo',
  codigo_pessoal = null, boas_vindas = '{"cidadao":"2026-08-05","parceiro":"2026-08-05","admin":"2026-08-05"}'::jsonb, aceite_termos = '{"versao":1,"em":"2026-08-05T09:00:00.000Z"}'::jsonb,
  criado_em = (now() + interval '-159664 minutes') where id = '00000000-0000-4000-8000-000000000012';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000013', 'authenticated', 'authenticated', 'moderacao@ecolink.app',
  extensions.crypt('senha123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
  '{"nome":"Renata Moderação"}'::jsonb, now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000013', '{"sub":"00000000-0000-4000-8000-000000000013","email":"moderacao@ecolink.app","email_verified":true}'::jsonb, 'email', now(), now(), now());
update public.perfis set papeis = array['moderador']::text[], telefone = '11999990013', cidade = 'São Paulo',
  codigo_pessoal = null, boas_vindas = '{"cidadao":"2026-06-26","parceiro":"2026-06-26","admin":"2026-06-26"}'::jsonb, aceite_termos = '{"versao":1,"em":"2026-06-26T09:00:00.000Z"}'::jsonb,
  criado_em = (now() + interval '-217264 minutes') where id = '00000000-0000-4000-8000-000000000013';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000014', 'authenticated', 'authenticated', 'admin@ecolink.app',
  extensions.crypt('senha123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
  '{"nome":"Equipe ECOLINK"}'::jsonb, now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-4000-8000-000000000014', '00000000-0000-4000-8000-000000000014', '{"sub":"00000000-0000-4000-8000-000000000014","email":"admin@ecolink.app","email_verified":true}'::jsonb, 'email', now(), now(), now());
update public.perfis set papeis = array['admin']::text[], telefone = '11999990014', cidade = 'São Paulo',
  codigo_pessoal = null, boas_vindas = '{"cidadao":"2026-05-27","parceiro":"2026-05-27","admin":"2026-05-27"}'::jsonb, aceite_termos = '{"versao":1,"em":"2026-05-27T09:00:00.000Z"}'::jsonb,
  criado_em = (now() + interval '-260464 minutes') where id = '00000000-0000-4000-8000-000000000014';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000015', 'authenticated', 'authenticated', 'sergio@email.com',
  extensions.crypt('senha123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
  '{"nome":"Sérgio Alves"}'::jsonb, now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-000000000015', '{"sub":"00000000-0000-4000-8000-000000000015","email":"sergio@email.com","email_verified":true}'::jsonb, 'email', now(), now(), now());
update public.perfis set papeis = array['parceiro_gestor']::text[], telefone = '11999990015', cidade = 'São Paulo',
  codigo_pessoal = null, boas_vindas = '{"cidadao":"2026-07-06","parceiro":"2026-07-06","admin":"2026-07-06"}'::jsonb, aceite_termos = '{"versao":1,"em":"2026-07-06T09:00:00.000Z"}'::jsonb,
  criado_em = (now() + interval '-202864 minutes') where id = '00000000-0000-4000-8000-000000000015';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000016', 'authenticated', 'authenticated', 'lucia@email.com',
  extensions.crypt('senha123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
  '{"nome":"Lúcia Prado"}'::jsonb, now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-4000-8000-000000000016', '00000000-0000-4000-8000-000000000016', '{"sub":"00000000-0000-4000-8000-000000000016","email":"lucia@email.com","email_verified":true}'::jsonb, 'email', now(), now(), now());
update public.perfis set papeis = array['parceiro_gestor']::text[], telefone = '21999990016', cidade = 'Rio de Janeiro',
  codigo_pessoal = null, boas_vindas = '{"cidadao":"2026-07-16","parceiro":"2026-07-16","admin":"2026-07-16"}'::jsonb, aceite_termos = '{"versao":1,"em":"2026-07-16T09:00:00.000Z"}'::jsonb,
  criado_em = (now() + interval '-188464 minutes') where id = '00000000-0000-4000-8000-000000000016';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000017', 'authenticated', 'authenticated', 'rafael@email.com',
  extensions.crypt('senha123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
  '{"nome":"Rafael Costa"}'::jsonb, now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-4000-8000-000000000017', '00000000-0000-4000-8000-000000000017', '{"sub":"00000000-0000-4000-8000-000000000017","email":"rafael@email.com","email_verified":true}'::jsonb, 'email', now(), now(), now());
update public.perfis set papeis = array['parceiro_gestor', 'cidadao']::text[], telefone = '11999990017', cidade = 'São Paulo',
  codigo_pessoal = 'K38L69NV', boas_vindas = '{"cidadao":"2026-11-20","parceiro":"2026-11-20","admin":"2026-11-20"}'::jsonb, aceite_termos = '{"versao":1,"em":"2026-11-20T09:00:00.000Z"}'::jsonb,
  criado_em = (now() + interval '-5584 minutes') where id = '00000000-0000-4000-8000-000000000017';
insert into public.organizacoes (id, nome, tipo, documento, responsavel_id, status) values
  (1, 'Rede EcoCentro', 'associacao', '48219357000191', '00000000-0000-4000-8000-000000000011', 'aprovada');
insert into public.organizacoes (id, nome, tipo, documento, responsavel_id, status) values
  (2, 'Cooperativa Recicla Juntos', 'cooperativa', '37190462000129', '00000000-0000-4000-8000-000000000015', 'aprovada');
insert into public.organizacoes (id, nome, tipo, documento, responsavel_id, status) values
  (3, 'ReciclaRio', 'empresa', '6RZK4QW8000102', '00000000-0000-4000-8000-000000000016', 'aprovada');
insert into public.organizacoes (id, nome, tipo, documento, responsavel_id, status) values
  (4, 'Associação Recicla Leste', 'associacao', '25804613000102', '00000000-0000-4000-8000-000000000017', 'em_analise');
insert into public.pontos (id, organizacao_id, nome, descricao, endereco, cidade, latitude, longitude, instrucoes_acesso,
  materiais, regras_materiais, horarios, excecoes, regras, fotos, status, aprovado_em) values
  (1, 1, 'EcoPonto Centro', 'Ecoponto da Rede EcoCentro na Praça da Sé. Recebemos recicláveis secos separados por tipo.', 'Praça da Sé, 100', 'São Paulo', -23.5505, -46.6333,
   'Entrada pela lateral, ao lado da banca de jornal.', array['papel', 'plástico', 'vidro']::text[], '{"papel":{"condicoes":"Limpo e seco","nao_aceita":"Papel engordurado, guardanapo e papel higiênico","capacidade_kg":21},"vidro":{"condicoes":"Cacos embrulhados em jornal ou caixa","nao_aceita":"Espelhos, lâmpadas e cerâmica","limite_kg":30,"capacidade_kg":40},"plástico":{"capacidade_kg":52}}'::jsonb, '{"dom":[],"seg":[{"abre":"08:00","fecha":"18:00"}],"ter":[{"abre":"08:00","fecha":"18:00"}],"qua":[{"abre":"08:00","fecha":"18:00"}],"qui":[{"abre":"08:00","fecha":"18:00"}],"sex":[{"abre":"08:00","fecha":"18:00"}],"sab":[]}'::jsonb,
   '[{"data":"2026-12-25","fechado":true,"motivo":"Natal"},{"data":"2027-01-01","fechado":true,"motivo":"Confraternização Universal"}]'::jsonb, '{"janela_min":30,"capacidade_janela":3,"antecedencia_horas":2,"aceite_automatico":false,"tolerancia_min":15,"prazo_resposta_horas":24}'::jsonb, '[]'::jsonb, 'ativo', (now() + interval '-141724 minutes'));
insert into public.pontos (id, organizacao_id, nome, descricao, endereco, cidade, latitude, longitude, instrucoes_acesso,
  materiais, regras_materiais, horarios, excecoes, regras, fotos, status, aprovado_em) values
  (2, 2, 'Coleta Vila Madalena', 'Ponto especializado em eletrônicos e pilhas, com destinação certificada.', 'Rua Harmonia, 250', 'São Paulo', -23.5546, -46.6896,
   'Portão verde; toque o interfone "Coleta".', array['eletrônicos', 'pilhas']::text[], '{"eletrônicos":{"condicoes":"Pequenos e médios aparelhos","nao_aceita":"Geladeiras, fogões e máquinas de lavar","limite_kg":15},"pilhas":{"condicoes":"Em saco plástico fechado","limite_kg":2}}'::jsonb, '{"seg":[{"abre":"09:00","fecha":"12:00"},{"abre":"13:00","fecha":"17:00"}],"ter":[{"abre":"09:00","fecha":"12:00"},{"abre":"13:00","fecha":"17:00"}],"qua":[{"abre":"09:00","fecha":"12:00"},{"abre":"13:00","fecha":"17:00"}],"qui":[{"abre":"09:00","fecha":"12:00"},{"abre":"13:00","fecha":"17:00"}],"sex":[{"abre":"09:00","fecha":"12:00"},{"abre":"13:00","fecha":"17:00"}],"sab":[{"abre":"09:00","fecha":"13:00"}],"dom":[]}'::jsonb,
   '[]'::jsonb, '{"janela_min":30,"capacidade_janela":3,"antecedencia_horas":2,"aceite_automatico":false,"tolerancia_min":15,"prazo_resposta_horas":24}'::jsonb, '[]'::jsonb, 'ativo', (now() + interval '-141724 minutes'));
insert into public.pontos (id, organizacao_id, nome, descricao, endereco, cidade, latitude, longitude, instrucoes_acesso,
  materiais, regras_materiais, horarios, excecoes, regras, fotos, status, aprovado_em) values
  (3, 3, 'ReciclaRio Copacabana', 'Ponto de entrega de metais e plásticos na orla.', 'Av. Atlântica, 1500', 'Rio de Janeiro', -22.9711, -43.1822,
   '', array['metal', 'plástico']::text[], '{}'::jsonb, '{"dom":[{"abre":"07:00","fecha":"19:00"}],"seg":[{"abre":"07:00","fecha":"19:00"}],"ter":[{"abre":"07:00","fecha":"19:00"}],"qua":[{"abre":"07:00","fecha":"19:00"}],"qui":[{"abre":"07:00","fecha":"19:00"}],"sex":[{"abre":"07:00","fecha":"19:00"}],"sab":[{"abre":"07:00","fecha":"19:00"}]}'::jsonb,
   '[]'::jsonb, '{"janela_min":30,"capacidade_janela":3,"antecedencia_horas":2,"aceite_automatico":false,"tolerancia_min":15,"prazo_resposta_horas":24}'::jsonb, '[]'::jsonb, 'ativo', (now() + interval '-141724 minutes'));
insert into public.pontos (id, organizacao_id, nome, descricao, endereco, cidade, latitude, longitude, instrucoes_acesso,
  materiais, regras_materiais, horarios, excecoes, regras, fotos, status, aprovado_em) values
  (4, 1, 'Recicla Pinheiros', 'Ecoponto com estacionamento para descarga de volumes maiores.', 'Rua dos Pinheiros, 1000', 'São Paulo', -23.5645, -46.6996,
   'Vaga de carga e descarga em frente ao portão.', array['papel', 'vidro', 'metal', 'papelão']::text[], '{"papelão":{"condicoes":"Desmontado e amarrado","capacidade_kg":42},"papel":{"capacidade_kg":5},"metal":{"capacidade_kg":6},"vidro":{"capacidade_kg":9}}'::jsonb, '{"dom":[],"seg":[{"abre":"08:00","fecha":"20:00"}],"ter":[{"abre":"08:00","fecha":"20:00"}],"qua":[{"abre":"08:00","fecha":"20:00"}],"qui":[{"abre":"08:00","fecha":"20:00"}],"sex":[{"abre":"08:00","fecha":"20:00"}],"sab":[]}'::jsonb,
   '[{"data":"2026-12-25","fechado":true,"motivo":"Natal"},{"data":"2027-01-01","fechado":true,"motivo":"Confraternização Universal"}]'::jsonb, '{"janela_min":30,"capacidade_janela":3,"antecedencia_horas":2,"aceite_automatico":false,"tolerancia_min":15,"prazo_resposta_horas":24}'::jsonb, '[]'::jsonb, 'ativo', (now() + interval '-141724 minutes'));
insert into public.pontos (id, organizacao_id, nome, descricao, endereco, cidade, latitude, longitude, instrucoes_acesso,
  materiais, regras_materiais, horarios, excecoes, regras, fotos, status, aprovado_em) values
  (5, 3, 'EcoStation Tijuca', 'Recebemos óleo de cozinha usado e eletrônicos, além de recicláveis secos.', 'Rua Conde de Bonfim, 500', 'Rio de Janeiro', -22.9249, -43.2336,
   '', array['papel', 'plástico', 'eletrônicos', 'óleo']::text[], '{"óleo":{"condicoes":"Frio, em garrafa PET bem fechada","limite_kg":10}}'::jsonb, '{"dom":[],"seg":[{"abre":"08:00","fecha":"18:00"}],"ter":[{"abre":"08:00","fecha":"18:00"}],"qua":[{"abre":"08:00","fecha":"18:00"}],"qui":[{"abre":"08:00","fecha":"18:00"}],"sex":[{"abre":"08:00","fecha":"18:00"}],"sab":[{"abre":"08:00","fecha":"18:00"}]}'::jsonb,
   '[]'::jsonb, '{"janela_min":30,"capacidade_janela":3,"antecedencia_horas":2,"aceite_automatico":false,"tolerancia_min":15,"prazo_resposta_horas":24}'::jsonb, '[]'::jsonb, 'ativo', (now() + interval '-141724 minutes'));
insert into public.pontos (id, organizacao_id, nome, descricao, endereco, cidade, latitude, longitude, instrucoes_acesso,
  materiais, regras_materiais, horarios, excecoes, regras, fotos, status, aprovado_em) values
  (6, 3, 'Verde Vale Campinas', 'Ponto temporariamente pausado para reforma.', 'Av. Norte-Sul, 800', 'Campinas', -22.9056, -47.0608,
   '', array['vidro', 'metal', 'pilhas']::text[], '{}'::jsonb, '{"dom":[],"seg":[{"abre":"09:00","fecha":"17:00"}],"ter":[{"abre":"09:00","fecha":"17:00"}],"qua":[{"abre":"09:00","fecha":"17:00"}],"qui":[{"abre":"09:00","fecha":"17:00"}],"sex":[{"abre":"09:00","fecha":"17:00"}],"sab":[]}'::jsonb,
   '[]'::jsonb, '{"janela_min":30,"capacidade_janela":3,"antecedencia_horas":2,"aceite_automatico":false,"tolerancia_min":15,"prazo_resposta_horas":24}'::jsonb, '[]'::jsonb, 'pausado', (now() + interval '-141724 minutes'));
insert into public.pontos (id, organizacao_id, nome, descricao, endereco, cidade, latitude, longitude, instrucoes_acesso,
  materiais, regras_materiais, horarios, excecoes, regras, fotos, status, aprovado_em) values
  (7, 2, 'Cooperativa Mooca', 'Galpão da cooperativa. Pagamos por kg de papelão e metal entregues separados.', 'Rua da Mooca, 1200', 'São Paulo', -23.5587, -46.5996,
   'Galpão ao fundo do terreno.', array['papel', 'papelão', 'plástico', 'metal', 'isopor']::text[], '{"papelão":{"condicoes":"Seco e desmontado","preco_kg":0.4},"metal":{"condicoes":"Latas amassadas","preco_kg":3.5},"isopor":{"condicoes":"Limpo, sem restos de comida"}}'::jsonb, '{"dom":[],"seg":[{"abre":"07:00","fecha":"16:00"}],"ter":[{"abre":"07:00","fecha":"16:00"}],"qua":[{"abre":"07:00","fecha":"16:00"}],"qui":[{"abre":"07:00","fecha":"16:00"}],"sex":[{"abre":"07:00","fecha":"16:00"}],"sab":[{"abre":"07:00","fecha":"16:00"}]}'::jsonb,
   '[]'::jsonb, '{"janela_min":30,"capacidade_janela":3,"antecedencia_horas":2,"aceite_automatico":true,"tolerancia_min":15,"prazo_resposta_horas":24}'::jsonb, '[]'::jsonb, 'ativo', (now() + interval '-141724 minutes'));
insert into public.pontos (id, organizacao_id, nome, descricao, endereco, cidade, latitude, longitude, instrucoes_acesso,
  materiais, regras_materiais, horarios, excecoes, regras, fotos, status, aprovado_em) values
  (8, 3, 'EcoPonto Botafogo', 'Vidro, óleo, pilhas e eletrônicos em Botafogo.', 'Rua Voluntários da Pátria, 300', 'Rio de Janeiro', -22.9519, -43.1857,
   '', array['vidro', 'óleo', 'pilhas', 'eletrônicos']::text[], '{}'::jsonb, '{"dom":[],"seg":[{"abre":"08:00","fecha":"19:00"}],"ter":[{"abre":"08:00","fecha":"19:00"}],"qua":[{"abre":"08:00","fecha":"19:00"}],"qui":[{"abre":"08:00","fecha":"19:00"}],"sex":[{"abre":"08:00","fecha":"19:00"}],"sab":[]}'::jsonb,
   '[]'::jsonb, '{"janela_min":30,"capacidade_janela":3,"antecedencia_horas":2,"aceite_automatico":false,"tolerancia_min":15,"prazo_resposta_horas":24}'::jsonb, '[]'::jsonb, 'ativo', (now() + interval '-141724 minutes'));
insert into public.pontos (id, organizacao_id, nome, descricao, endereco, cidade, latitude, longitude, instrucoes_acesso,
  materiais, regras_materiais, horarios, excecoes, regras, fotos, status, aprovado_em) values
  (9, 3, 'ReciclaRio Barra', 'Novo ponto da ReciclaRio na Barra da Tijuca, dentro do estacionamento do shopping.', 'Av. das Américas, 4666', 'Rio de Janeiro', -23.0004, -43.3659,
   'Estacionamento G2, próximo à saída B.', array['papel', 'plástico', 'metal', 'vidro']::text[], '{"vidro":{"condicoes":"Sem tampas","limite_kg":20}}'::jsonb, '{"dom":[{"abre":"14:00","fecha":"20:00"}],"seg":[{"abre":"10:00","fecha":"22:00"}],"ter":[{"abre":"10:00","fecha":"22:00"}],"qua":[{"abre":"10:00","fecha":"22:00"}],"qui":[{"abre":"10:00","fecha":"22:00"}],"sex":[{"abre":"10:00","fecha":"22:00"}],"sab":[{"abre":"10:00","fecha":"22:00"}]}'::jsonb,
   '[]'::jsonb, '{"janela_min":30,"capacidade_janela":3,"antecedencia_horas":2,"aceite_automatico":false,"tolerancia_min":15,"prazo_resposta_horas":24}'::jsonb, '[]'::jsonb, 'em_analise', null);
insert into public.membros (id, ponto_id, usuario_id, papel, ativo, desde) values
  (1, 1, '00000000-0000-4000-8000-000000000011', 'gestor', true, (privado.hoje_local() + -120));
insert into public.membros (id, ponto_id, usuario_id, papel, ativo, desde) values
  (2, 4, '00000000-0000-4000-8000-000000000011', 'gestor', true, (privado.hoje_local() + -120));
insert into public.membros (id, ponto_id, usuario_id, papel, ativo, desde) values
  (3, 2, '00000000-0000-4000-8000-000000000012', 'operador', true, (privado.hoje_local() + -110));
insert into public.membros (id, ponto_id, usuario_id, papel, ativo, desde) values
  (4, 2, '00000000-0000-4000-8000-000000000015', 'gestor', true, (privado.hoje_local() + -140));
insert into public.membros (id, ponto_id, usuario_id, papel, ativo, desde) values
  (5, 7, '00000000-0000-4000-8000-000000000015', 'gestor', true, (privado.hoje_local() + -140));
insert into public.membros (id, ponto_id, usuario_id, papel, ativo, desde) values
  (6, 3, '00000000-0000-4000-8000-000000000016', 'gestor', true, (privado.hoje_local() + -130));
insert into public.membros (id, ponto_id, usuario_id, papel, ativo, desde) values
  (7, 5, '00000000-0000-4000-8000-000000000016', 'gestor', true, (privado.hoje_local() + -130));
insert into public.membros (id, ponto_id, usuario_id, papel, ativo, desde) values
  (8, 6, '00000000-0000-4000-8000-000000000016', 'gestor', true, (privado.hoje_local() + -130));
insert into public.membros (id, ponto_id, usuario_id, papel, ativo, desde) values
  (9, 8, '00000000-0000-4000-8000-000000000016', 'gestor', true, (privado.hoje_local() + -130));
insert into public.membros (id, ponto_id, usuario_id, papel, ativo, desde) values
  (10, 9, '00000000-0000-4000-8000-000000000016', 'gestor', true, (privado.hoje_local() + -130));
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (1, 'ECO-PUFW3', '00000000-0000-4000-8000-000000000008', 6, 'agendada', (privado.hoje_local() + -60),
   '09:00', '09:30', '[{"material":"metal","kg_declarado":4.2,"kg_aferido":3.9,"status":"aprovado","motivo":null},{"material":"vidro","kg_declarado":4.1,"kg_aferido":3.6,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-90004 minutes'), now(),
   (now() + interval '-89909 minutes'), (now() + interval '-87103 minutes'), null, false,
   '00000000-0000-4000-8000-000000000016', 68, '{"numero":"ECO-PUFW3","emitido_em":"2026-09-24T09:21:00.000Z","ponto":"Verde Vale Campinas","operador":"Lúcia P.","itens":[{"material":"metal","kg_declarado":4.2,"kg_aferido":3.9,"status":"aprovado","motivo":null},{"material":"vidro","kg_declarado":4.1,"kg_aferido":3.6,"status":"aprovado","motivo":null}],"total_kg":7.5,"pontos":68}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (2, 'ECO-87RQA', '00000000-0000-4000-8000-000000000001', 4, 'agendada', (privado.hoje_local() + -59),
   '18:30', '19:00', '[{"material":"papelão","kg_declarado":7.3,"kg_aferido":6.2,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-87994 minutes'), now(),
   (now() + interval '-87899 minutes'), (now() + interval '-85103 minutes'), null, false,
   '00000000-0000-4000-8000-000000000011', 43, '{"numero":"ECO-87RQA","emitido_em":"2026-09-25T18:41:00.000Z","ponto":"Recicla Pinheiros","operador":"Marcos L.","itens":[{"material":"papelão","kg_declarado":7.3,"kg_aferido":6.2,"status":"aprovado","motivo":null}],"total_kg":6.2,"pontos":43}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (3, 'ECO-8HM3Y', '00000000-0000-4000-8000-000000000008', 6, 'agendada', (privado.hoje_local() + -59),
   '16:30', '17:00', '[{"material":"metal","kg_declarado":3.6,"kg_aferido":3.5,"status":"aprovado","motivo":null},{"material":"pilhas","kg_declarado":1.3,"kg_aferido":1.4,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-88114 minutes'), now(),
   (now() + interval '-88019 minutes'), (now() + interval '-85223 minutes'), null, false,
   '00000000-0000-4000-8000-000000000016', 77, '{"numero":"ECO-8HM3Y","emitido_em":"2026-09-25T16:41:00.000Z","ponto":"Verde Vale Campinas","operador":"Lúcia P.","itens":[{"material":"metal","kg_declarado":3.6,"kg_aferido":3.5,"status":"aprovado","motivo":null},{"material":"pilhas","kg_declarado":1.3,"kg_aferido":1.4,"status":"aprovado","motivo":null}],"total_kg":4.9,"pontos":77}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (4, 'ECO-8W2BV', '00000000-0000-4000-8000-000000000003', 5, 'agendada', (privado.hoje_local() + -58),
   '08:30', '09:00', '[{"material":"eletrônicos","kg_declarado":2.1,"kg_aferido":1.9,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-87154 minutes'), now(),
   (now() + interval '-87059 minutes'), (now() + interval '-84255 minutes'), null, false,
   '00000000-0000-4000-8000-000000000016', 38, '{"numero":"ECO-8W2BV","emitido_em":"2026-09-26T08:49:00.000Z","ponto":"EcoStation Tijuca","operador":"Lúcia P.","itens":[{"material":"eletrônicos","kg_declarado":2.1,"kg_aferido":1.9,"status":"aprovado","motivo":null}],"total_kg":1.9,"pontos":38}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (5, 'ECO-6SNWZ', '00000000-0000-4000-8000-000000000002', 7, 'agendada', (privado.hoje_local() + -55),
   '09:30', '10:00', '[{"material":"plástico","kg_declarado":3.9,"kg_aferido":3.8,"status":"aprovado","motivo":null},{"material":"isopor","kg_declarado":1.7,"kg_aferido":null,"status":"rejeitado","motivo":"Material sujo ou contaminado"}]'::jsonb, 'concluida', null,
   null, (now() + interval '-82774 minutes'), now(),
   (now() + interval '-82679 minutes'), (now() + interval '-79881 minutes'), null, false,
   '00000000-0000-4000-8000-000000000015', 38, '{"numero":"ECO-6SNWZ","emitido_em":"2026-09-29T09:43:00.000Z","ponto":"Cooperativa Mooca","operador":"Sérgio A.","itens":[{"material":"plástico","kg_declarado":3.9,"kg_aferido":3.8,"status":"aprovado","motivo":null},{"material":"isopor","kg_declarado":1.7,"kg_aferido":null,"status":"rejeitado","motivo":"Material sujo ou contaminado"}],"total_kg":3.8,"pontos":38}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (6, 'ECO-NCPLR', '00000000-0000-4000-8000-000000000002', 2, 'agendada', (privado.hoje_local() + -54),
   '09:30', '10:00', '[{"material":"eletrônicos","kg_declarado":2.7,"kg_aferido":2.3,"status":"aprovado","motivo":null},{"material":"pilhas","kg_declarado":1,"kg_aferido":0.9,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-81334 minutes'), now(),
   (now() + interval '-81239 minutes'), (now() + interval '-78437 minutes'), null, false,
   '00000000-0000-4000-8000-000000000012', 69, '{"numero":"ECO-NCPLR","emitido_em":"2026-09-30T09:47:00.000Z","ponto":"Coleta Vila Madalena","operador":"Paula S.","itens":[{"material":"eletrônicos","kg_declarado":2.7,"kg_aferido":2.3,"status":"aprovado","motivo":null},{"material":"pilhas","kg_declarado":1,"kg_aferido":0.9,"status":"aprovado","motivo":null}],"total_kg":3.2,"pontos":69}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (7, 'ECO-3Z6Z4', '00000000-0000-4000-8000-000000000003', 3, 'agendada', (privado.hoje_local() + -54),
   '12:00', '12:30', '[{"material":"plástico","kg_declarado":4.9,"kg_aferido":4.3,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-81184 minutes'), now(),
   (now() + interval '-81089 minutes'), (now() + interval '-78283 minutes'), null, false,
   '00000000-0000-4000-8000-000000000016', 43, '{"numero":"ECO-3Z6Z4","emitido_em":"2026-09-30T12:21:00.000Z","ponto":"ReciclaRio Copacabana","operador":"Lúcia P.","itens":[{"material":"plástico","kg_declarado":4.9,"kg_aferido":4.3,"status":"aprovado","motivo":null}],"total_kg":4.3,"pontos":43}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (8, 'ECO-WR2ZQ', '00000000-0000-4000-8000-000000000005', 3, 'agendada', (privado.hoje_local() + -54),
   '17:30', '18:00', '[{"material":"metal","kg_declarado":4.4,"kg_aferido":4.6,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-80854 minutes'), now(),
   (now() + interval '-80759 minutes'), (now() + interval '-77955 minutes'), null, false,
   '00000000-0000-4000-8000-000000000016', 55, '{"numero":"ECO-WR2ZQ","emitido_em":"2026-09-30T17:49:00.000Z","ponto":"ReciclaRio Copacabana","operador":"Lúcia P.","itens":[{"material":"metal","kg_declarado":4.4,"kg_aferido":4.6,"status":"aprovado","motivo":null}],"total_kg":4.6,"pontos":55}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (9, 'ECO-GJ288', '00000000-0000-4000-8000-000000000001', 1, 'agendada', (privado.hoje_local() + -52),
   '11:00', '11:30', '[{"material":"vidro","kg_declarado":5.5,"kg_aferido":4.7,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-78364 minutes'), now(),
   (now() + interval '-78269 minutes'), (now() + interval '-75462 minutes'), null, false,
   '00000000-0000-4000-8000-000000000011', 28, '{"numero":"ECO-GJ288","emitido_em":"2026-10-02T11:22:00.000Z","ponto":"EcoPonto Centro","operador":"Marcos L.","itens":[{"material":"vidro","kg_declarado":5.5,"kg_aferido":4.7,"status":"aprovado","motivo":null}],"total_kg":4.7,"pontos":28}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (10, 'ECO-A8V6H', '00000000-0000-4000-8000-000000000001', 1, 'agendada', (privado.hoje_local() + -52),
   '12:30', '13:00', '[{"material":"papel","kg_declarado":8.6,"kg_aferido":9.1,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-78274 minutes'), now(),
   (now() + interval '-78179 minutes'), (now() + interval '-75376 minutes'), null, false,
   '00000000-0000-4000-8000-000000000011', 73, '{"numero":"ECO-A8V6H","emitido_em":"2026-10-02T12:48:00.000Z","ponto":"EcoPonto Centro","operador":"Marcos L.","itens":[{"material":"papel","kg_declarado":8.6,"kg_aferido":9.1,"status":"aprovado","motivo":null}],"total_kg":9.1,"pontos":73}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (11, 'ECO-LPEGK', '00000000-0000-4000-8000-000000000007', 2, 'agendada', (privado.hoje_local() + -51),
   '12:00', '12:30', '[{"material":"eletrônicos","kg_declarado":1.2,"kg_aferido":1.1,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-76864 minutes'), now(),
   (now() + interval '-76769 minutes'), (now() + interval '-73963 minutes'), null, false,
   '00000000-0000-4000-8000-000000000012', 22, '{"numero":"ECO-LPEGK","emitido_em":"2026-10-03T12:21:00.000Z","ponto":"Coleta Vila Madalena","operador":"Paula S.","itens":[{"material":"eletrônicos","kg_declarado":1.2,"kg_aferido":1.1,"status":"aprovado","motivo":null}],"total_kg":1.1,"pontos":22}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (12, 'ECO-6NNPN', '00000000-0000-4000-8000-000000000003', 3, 'agendada', (privado.hoje_local() + -48),
   '09:30', '10:00', '[{"material":"plástico","kg_declarado":5.8,"kg_aferido":5.6,"status":"aprovado","motivo":null},{"material":"metal","kg_declarado":4.5,"kg_aferido":3.9,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-72694 minutes'), now(),
   (now() + interval '-72599 minutes'), (now() + interval '-69797 minutes'), null, false,
   '00000000-0000-4000-8000-000000000016', 103, '{"numero":"ECO-6NNPN","emitido_em":"2026-10-06T09:47:00.000Z","ponto":"ReciclaRio Copacabana","operador":"Lúcia P.","itens":[{"material":"plástico","kg_declarado":5.8,"kg_aferido":5.6,"status":"aprovado","motivo":null},{"material":"metal","kg_declarado":4.5,"kg_aferido":3.9,"status":"aprovado","motivo":null}],"total_kg":9.5,"pontos":103}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (13, 'ECO-NZU3L', '00000000-0000-4000-8000-000000000004', 4, 'agendada', (privado.hoje_local() + -48),
   '18:30', '19:00', '[{"material":"papelão","kg_declarado":6.9,"kg_aferido":6.3,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-72154 minutes'), now(),
   (now() + interval '-72059 minutes'), (now() + interval '-69249 minutes'), null, false,
   '00000000-0000-4000-8000-000000000011', 44, '{"numero":"ECO-NZU3L","emitido_em":"2026-10-06T18:55:00.000Z","ponto":"Recicla Pinheiros","operador":"Marcos L.","itens":[{"material":"papelão","kg_declarado":6.9,"kg_aferido":6.3,"status":"aprovado","motivo":null}],"total_kg":6.3,"pontos":44}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (14, 'ECO-NLCJ4', '00000000-0000-4000-8000-000000000006', 4, 'agendada', (privado.hoje_local() + -48),
   '15:30', '16:00', '[{"material":"vidro","kg_declarado":6.4,"kg_aferido":5.5,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-72334 minutes'), now(),
   (now() + interval '-72239 minutes'), (now() + interval '-69436 minutes'), null, false,
   '00000000-0000-4000-8000-000000000011', 33, '{"numero":"ECO-NLCJ4","emitido_em":"2026-10-06T15:48:00.000Z","ponto":"Recicla Pinheiros","operador":"Marcos L.","itens":[{"material":"vidro","kg_declarado":6.4,"kg_aferido":5.5,"status":"aprovado","motivo":null}],"total_kg":5.5,"pontos":33}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (15, 'ECO-4UNUF', '00000000-0000-4000-8000-000000000003', 5, 'agendada', (privado.hoje_local() + -47),
   '09:00', '09:30', '[{"material":"papel","kg_declarado":5.4,"kg_aferido":4.7,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-71284 minutes'), now(),
   (now() + interval '-71189 minutes'), (now() + interval '-68395 minutes'), null, false,
   '00000000-0000-4000-8000-000000000016', 38, '{"numero":"ECO-4UNUF","emitido_em":"2026-10-07T09:09:00.000Z","ponto":"EcoStation Tijuca","operador":"Lúcia P.","itens":[{"material":"papel","kg_declarado":5.4,"kg_aferido":4.7,"status":"aprovado","motivo":null}],"total_kg":4.7,"pontos":38}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (16, 'ECO-4773A', '00000000-0000-4000-8000-000000000009', 5, 'agendada', (privado.hoje_local() + -47),
   '08:30', '09:00', '[{"material":"papel","kg_declarado":4.2,"kg_aferido":4.1,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-71314 minutes'), now(),
   (now() + interval '-71219 minutes'), (now() + interval '-68423 minutes'), null, false,
   '00000000-0000-4000-8000-000000000016', 33, '{"numero":"ECO-4773A","emitido_em":"2026-10-07T08:41:00.000Z","ponto":"EcoStation Tijuca","operador":"Lúcia P.","itens":[{"material":"papel","kg_declarado":4.2,"kg_aferido":4.1,"status":"aprovado","motivo":null}],"total_kg":4.1,"pontos":33}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (17, 'ECO-CNBFZ', '00000000-0000-4000-8000-000000000004', 2, 'agendada', (privado.hoje_local() + -45),
   '15:30', '16:00', '[{"material":"eletrônicos","kg_declarado":4.4,"kg_aferido":3.9,"status":"aprovado","motivo":null},{"material":"pilhas","kg_declarado":1.4,"kg_aferido":1.5,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-68014 minutes'), now(),
   (now() + interval '-67919 minutes'), (now() + interval '-65113 minutes'), null, false,
   '00000000-0000-4000-8000-000000000012', 116, '{"numero":"ECO-CNBFZ","emitido_em":"2026-10-09T15:51:00.000Z","ponto":"Coleta Vila Madalena","operador":"Paula S.","itens":[{"material":"eletrônicos","kg_declarado":4.4,"kg_aferido":3.9,"status":"aprovado","motivo":null},{"material":"pilhas","kg_declarado":1.4,"kg_aferido":1.5,"status":"aprovado","motivo":null}],"total_kg":5.4,"pontos":116}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (18, 'ECO-2ZN8X', '00000000-0000-4000-8000-000000000001', 2, 'agendada', (privado.hoje_local() + -44),
   '10:30', '11:00', '[{"material":"pilhas","kg_declarado":1.4,"kg_aferido":1.2,"status":"aprovado","motivo":null},{"material":"eletrônicos","kg_declarado":1.2,"kg_aferido":1.1,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-66874 minutes'), now(),
   (now() + interval '-66779 minutes'), (now() + interval '-63981 minutes'), null, false,
   '00000000-0000-4000-8000-000000000012', 52, '{"numero":"ECO-2ZN8X","emitido_em":"2026-10-10T10:43:00.000Z","ponto":"Coleta Vila Madalena","operador":"Paula S.","itens":[{"material":"pilhas","kg_declarado":1.4,"kg_aferido":1.2,"status":"aprovado","motivo":null},{"material":"eletrônicos","kg_declarado":1.2,"kg_aferido":1.1,"status":"aprovado","motivo":null}],"total_kg":2.3,"pontos":52}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (19, 'ECO-3KBCV', '00000000-0000-4000-8000-000000000001', 2, 'agendada', (privado.hoje_local() + -42),
   '14:30', '15:00', '[{"material":"eletrônicos","kg_declarado":1.9,"kg_aferido":1.9,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-63754 minutes'), now(),
   (now() + interval '-63659 minutes'), (now() + interval '-60860 minutes'), null, false,
   '00000000-0000-4000-8000-000000000012', 38, '{"numero":"ECO-3KBCV","emitido_em":"2026-10-12T14:44:00.000Z","ponto":"Coleta Vila Madalena","operador":"Paula S.","itens":[{"material":"eletrônicos","kg_declarado":1.9,"kg_aferido":1.9,"status":"aprovado","motivo":null}],"total_kg":1.9,"pontos":38}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (20, 'ECO-GMZ9P', '00000000-0000-4000-8000-000000000010', 4, 'agendada', (privado.hoje_local() + -41),
   '16:30', '17:00', '[{"material":"papel","kg_declarado":2.1,"kg_aferido":1.9,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-62194 minutes'), now(),
   (now() + interval '-62099 minutes'), (now() + interval '-59297 minutes'), null, false,
   '00000000-0000-4000-8000-000000000011', 15, '{"numero":"ECO-GMZ9P","emitido_em":"2026-10-13T16:47:00.000Z","ponto":"Recicla Pinheiros","operador":"Marcos L.","itens":[{"material":"papel","kg_declarado":2.1,"kg_aferido":1.9,"status":"aprovado","motivo":null}],"total_kg":1.9,"pontos":15}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (21, 'ECO-9DFFL', '00000000-0000-4000-8000-000000000001', 1, 'agendada', (privado.hoje_local() + -39),
   '09:00', '09:30', '[{"material":"papel","kg_declarado":7.5,"kg_aferido":null,"status":"pendente","motivo":null}]'::jsonb, 'cancelada', 'Tive um imprevisto',
   null, (now() + interval '-61264 minutes'), now(),
   null, null, null, false,
   null, 0, 'null'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (22, 'ECO-9R2P4', '00000000-0000-4000-8000-000000000007', 1, 'agendada', (privado.hoje_local() + -39),
   '14:30', '15:00', '[{"material":"papel","kg_declarado":2.1,"kg_aferido":1.8,"status":"aprovado","motivo":null},{"material":"vidro","kg_declarado":6.4,"kg_aferido":5.5,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-59434 minutes'), now(),
   (now() + interval '-59339 minutes'), (now() + interval '-56535 minutes'), null, false,
   '00000000-0000-4000-8000-000000000011', 47, '{"numero":"ECO-9R2P4","emitido_em":"2026-10-15T14:49:00.000Z","ponto":"EcoPonto Centro","operador":"Marcos L.","itens":[{"material":"papel","kg_declarado":2.1,"kg_aferido":1.8,"status":"aprovado","motivo":null},{"material":"vidro","kg_declarado":6.4,"kg_aferido":5.5,"status":"aprovado","motivo":null}],"total_kg":7.3,"pontos":47}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (23, 'ECO-K7CM4', '00000000-0000-4000-8000-000000000008', 6, 'agendada', (privado.hoje_local() + -38),
   '14:30', '15:00', '[{"material":"pilhas","kg_declarado":1.2,"kg_aferido":1.1,"status":"aprovado","motivo":null},{"material":"vidro","kg_declarado":4.2,"kg_aferido":4.3,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-57994 minutes'), now(),
   (now() + interval '-57899 minutes'), (now() + interval '-55092 minutes'), null, false,
   '00000000-0000-4000-8000-000000000016', 53, '{"numero":"ECO-K7CM4","emitido_em":"2026-10-16T14:52:00.000Z","ponto":"Verde Vale Campinas","operador":"Lúcia P.","itens":[{"material":"pilhas","kg_declarado":1.2,"kg_aferido":1.1,"status":"aprovado","motivo":null},{"material":"vidro","kg_declarado":4.2,"kg_aferido":4.3,"status":"aprovado","motivo":null}],"total_kg":5.4,"pontos":53}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (24, 'ECO-EYYSD', '00000000-0000-4000-8000-000000000002', 7, 'agendada', (privado.hoje_local() + -37),
   '10:30', '11:00', '[{"material":"metal","kg_declarado":6.1,"kg_aferido":5.6,"status":"aprovado","motivo":null},{"material":"isopor","kg_declarado":2,"kg_aferido":2,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-56794 minutes'), now(),
   (now() + interval '-56699 minutes'), (now() + interval '-53898 minutes'), null, false,
   '00000000-0000-4000-8000-000000000015', 85, '{"numero":"ECO-EYYSD","emitido_em":"2026-10-17T10:46:00.000Z","ponto":"Cooperativa Mooca","operador":"Sérgio A.","itens":[{"material":"metal","kg_declarado":6.1,"kg_aferido":5.6,"status":"aprovado","motivo":null},{"material":"isopor","kg_declarado":2,"kg_aferido":2,"status":"aprovado","motivo":null}],"total_kg":7.6,"pontos":85}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (25, 'ECO-576YF', '00000000-0000-4000-8000-000000000002', 2, 'agendada', (privado.hoje_local() + -35),
   '09:30', '10:00', '[{"material":"eletrônicos","kg_declarado":3.8,"kg_aferido":3.5,"status":"aprovado","motivo":null},{"material":"pilhas","kg_declarado":0.4,"kg_aferido":0.4,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-53974 minutes'), now(),
   (now() + interval '-53879 minutes'), (now() + interval '-51080 minutes'), null, false,
   '00000000-0000-4000-8000-000000000012', 80, '{"numero":"ECO-576YF","emitido_em":"2026-10-19T09:44:00.000Z","ponto":"Coleta Vila Madalena","operador":"Paula S.","itens":[{"material":"eletrônicos","kg_declarado":3.8,"kg_aferido":3.5,"status":"aprovado","motivo":null},{"material":"pilhas","kg_declarado":0.4,"kg_aferido":0.4,"status":"aprovado","motivo":null}],"total_kg":3.9,"pontos":80}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (26, 'ECO-8ZNCK', '00000000-0000-4000-8000-000000000006', 4, 'agendada', (privado.hoje_local() + -35),
   '18:00', '18:30', '[{"material":"vidro","kg_declarado":4,"kg_aferido":3.9,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-53464 minutes'), now(),
   (now() + interval '-53369 minutes'), (now() + interval '-50568 minutes'), null, false,
   '00000000-0000-4000-8000-000000000011', 23, '{"numero":"ECO-8ZNCK","emitido_em":"2026-10-19T18:16:00.000Z","ponto":"Recicla Pinheiros","operador":"Marcos L.","itens":[{"material":"vidro","kg_declarado":4,"kg_aferido":3.9,"status":"aprovado","motivo":null}],"total_kg":3.9,"pontos":23}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (27, 'ECO-VC8ZJ', '00000000-0000-4000-8000-000000000007', 2, 'agendada', (privado.hoje_local() + -35),
   '10:30', '11:00', '[{"material":"pilhas","kg_declarado":0.6,"kg_aferido":0.5,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-53914 minutes'), now(),
   (now() + interval '-53819 minutes'), (now() + interval '-51024 minutes'), null, false,
   '00000000-0000-4000-8000-000000000012', 13, '{"numero":"ECO-VC8ZJ","emitido_em":"2026-10-19T10:40:00.000Z","ponto":"Coleta Vila Madalena","operador":"Paula S.","itens":[{"material":"pilhas","kg_declarado":0.6,"kg_aferido":0.5,"status":"aprovado","motivo":null}],"total_kg":0.5,"pontos":13}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (28, 'ECO-YKWST', '00000000-0000-4000-8000-000000000009', 8, 'agendada', (privado.hoje_local() + -34),
   '09:30', '10:00', '[{"material":"vidro","kg_declarado":4.8,"kg_aferido":4.4,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-52534 minutes'), now(),
   (now() + interval '-52439 minutes'), (now() + interval '-49629 minutes'), null, false,
   '00000000-0000-4000-8000-000000000016', 26, '{"numero":"ECO-YKWST","emitido_em":"2026-10-20T09:55:00.000Z","ponto":"EcoPonto Botafogo","operador":"Lúcia P.","itens":[{"material":"vidro","kg_declarado":4.8,"kg_aferido":4.4,"status":"aprovado","motivo":null}],"total_kg":4.4,"pontos":26}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (29, 'ECO-74KJF', '00000000-0000-4000-8000-000000000004', 7, 'agendada', (privado.hoje_local() + -33),
   '10:00', '10:30', '[{"material":"isopor","kg_declarado":1.1,"kg_aferido":null,"status":"pendente","motivo":null},{"material":"papelão","kg_declarado":1.7,"kg_aferido":null,"status":"pendente","motivo":null}]'::jsonb, 'cancelada', 'Tive um imprevisto',
   null, (now() + interval '-52624 minutes'), now(),
   null, null, null, false,
   null, 0, 'null'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (30, 'ECO-NPLS2', '00000000-0000-4000-8000-000000000004', 4, 'agendada', (privado.hoje_local() + -32),
   '18:00', '18:30', '[{"material":"metal","kg_declarado":3.5,"kg_aferido":3,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-49144 minutes'), now(),
   (now() + interval '-49049 minutes'), (now() + interval '-46257 minutes'), null, false,
   '00000000-0000-4000-8000-000000000011', 36, '{"numero":"ECO-NPLS2","emitido_em":"2026-10-22T18:07:00.000Z","ponto":"Recicla Pinheiros","operador":"Marcos L.","itens":[{"material":"metal","kg_declarado":3.5,"kg_aferido":3,"status":"aprovado","motivo":null}],"total_kg":3,"pontos":36}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (31, 'ECO-SNMFW', '00000000-0000-4000-8000-000000000005', 5, 'agendada', (privado.hoje_local() + -32),
   '11:30', '12:00', '[{"material":"plástico","kg_declarado":2.9,"kg_aferido":3,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-49534 minutes'), now(),
   (now() + interval '-49439 minutes'), (now() + interval '-46633 minutes'), null, false,
   '00000000-0000-4000-8000-000000000016', 30, '{"numero":"ECO-SNMFW","emitido_em":"2026-10-22T11:51:00.000Z","ponto":"EcoStation Tijuca","operador":"Lúcia P.","itens":[{"material":"plástico","kg_declarado":2.9,"kg_aferido":3,"status":"aprovado","motivo":null}],"total_kg":3,"pontos":30}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (32, 'ECO-Z6A9T', '00000000-0000-4000-8000-000000000002', 4, 'agendada', (privado.hoje_local() + -31),
   '15:00', '15:30', '[{"material":"papelão","kg_declarado":4.1,"kg_aferido":3.8,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-47884 minutes'), now(),
   (now() + interval '-47789 minutes'), (now() + interval '-44995 minutes'), null, false,
   '00000000-0000-4000-8000-000000000011', 27, '{"numero":"ECO-Z6A9T","emitido_em":"2026-10-23T15:09:00.000Z","ponto":"Recicla Pinheiros","operador":"Marcos L.","itens":[{"material":"papelão","kg_declarado":4.1,"kg_aferido":3.8,"status":"aprovado","motivo":null}],"total_kg":3.8,"pontos":27}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (33, 'ECO-MAFC8', '00000000-0000-4000-8000-000000000001', 2, 'agendada', (privado.hoje_local() + -30),
   '12:00', '12:30', '[{"material":"pilhas","kg_declarado":1.1,"kg_aferido":1.2,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-46624 minutes'), now(),
   (now() + interval '-46529 minutes'), (now() + interval '-43719 minutes'), null, false,
   '00000000-0000-4000-8000-000000000012', 30, '{"numero":"ECO-MAFC8","emitido_em":"2026-10-24T12:25:00.000Z","ponto":"Coleta Vila Madalena","operador":"Paula S.","itens":[{"material":"pilhas","kg_declarado":1.1,"kg_aferido":1.2,"status":"aprovado","motivo":null}],"total_kg":1.2,"pontos":30}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (34, 'ECO-JMNRG', '00000000-0000-4000-8000-000000000003', 5, 'agendada', (privado.hoje_local() + -30),
   '16:30', '17:00', '[{"material":"plástico","kg_declarado":4.2,"kg_aferido":4.5,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-46354 minutes'), now(),
   (now() + interval '-46259 minutes'), (now() + interval '-43455 minutes'), null, false,
   '00000000-0000-4000-8000-000000000016', 45, '{"numero":"ECO-JMNRG","emitido_em":"2026-10-24T16:49:00.000Z","ponto":"EcoStation Tijuca","operador":"Lúcia P.","itens":[{"material":"plástico","kg_declarado":4.2,"kg_aferido":4.5,"status":"aprovado","motivo":null}],"total_kg":4.5,"pontos":45}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (35, 'ECO-32G9E', '00000000-0000-4000-8000-000000000002', 7, 'agendada', (privado.hoje_local() + -27),
   '09:30', '10:00', '[{"material":"plástico","kg_declarado":4.4,"kg_aferido":4.3,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-42454 minutes'), now(),
   (now() + interval '-42359 minutes'), (now() + interval '-39566 minutes'), null, false,
   '00000000-0000-4000-8000-000000000015', 43, '{"numero":"ECO-32G9E","emitido_em":"2026-10-27T09:38:00.000Z","ponto":"Cooperativa Mooca","operador":"Sérgio A.","itens":[{"material":"plástico","kg_declarado":4.4,"kg_aferido":4.3,"status":"aprovado","motivo":null}],"total_kg":4.3,"pontos":43}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (36, 'ECO-9MMLE', '00000000-0000-4000-8000-000000000003', 3, 'agendada', (privado.hoje_local() + -25),
   '15:30', '16:00', '[{"material":"plástico","kg_declarado":3.6,"kg_aferido":null,"status":"pendente","motivo":null}]'::jsonb, 'cancelada', 'Tive um imprevisto',
   null, (now() + interval '-41104 minutes'), now(),
   null, null, null, false,
   null, 0, 'null'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (37, 'ECO-74WZM', '00000000-0000-4000-8000-000000000001', 1, 'agendada', (privado.hoje_local() + -24),
   '14:00', '14:30', '[{"material":"papel","kg_declarado":3.9,"kg_aferido":3.4,"status":"aprovado","motivo":null},{"material":"vidro","kg_declarado":4.2,"kg_aferido":3.9,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-37864 minutes'), now(),
   (now() + interval '-37769 minutes'), (now() + interval '-34969 minutes'), null, false,
   '00000000-0000-4000-8000-000000000011', 51, '{"numero":"ECO-74WZM","emitido_em":"2026-10-30T14:15:00.000Z","ponto":"EcoPonto Centro","operador":"Marcos L.","itens":[{"material":"papel","kg_declarado":3.9,"kg_aferido":3.4,"status":"aprovado","motivo":null},{"material":"vidro","kg_declarado":4.2,"kg_aferido":3.9,"status":"aprovado","motivo":null}],"total_kg":7.3,"pontos":51}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (38, 'ECO-XSM4T', '00000000-0000-4000-8000-000000000007', 2, 'agendada', (privado.hoje_local() + -24),
   '10:30', '11:00', '[{"material":"eletrônicos","kg_declarado":3.6,"kg_aferido":3.9,"status":"aprovado","motivo":null},{"material":"pilhas","kg_declarado":1,"kg_aferido":1,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-38074 minutes'), now(),
   (now() + interval '-37979 minutes'), (now() + interval '-35176 minutes'), null, false,
   '00000000-0000-4000-8000-000000000012', 103, '{"numero":"ECO-XSM4T","emitido_em":"2026-10-30T10:48:00.000Z","ponto":"Coleta Vila Madalena","operador":"Paula S.","itens":[{"material":"eletrônicos","kg_declarado":3.6,"kg_aferido":3.9,"status":"aprovado","motivo":null},{"material":"pilhas","kg_declarado":1,"kg_aferido":1,"status":"aprovado","motivo":null}],"total_kg":4.9,"pontos":103}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (39, 'ECO-F86LW', '00000000-0000-4000-8000-000000000003', 5, 'agendada', (privado.hoje_local() + -23),
   '09:30', '10:00', '[{"material":"óleo","kg_declarado":2.9,"kg_aferido":2.7,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-36694 minutes'), now(),
   (now() + interval '-36599 minutes'), (now() + interval '-33798 minutes'), null, false,
   '00000000-0000-4000-8000-000000000016', 41, '{"numero":"ECO-F86LW","emitido_em":"2026-10-31T09:46:00.000Z","ponto":"EcoStation Tijuca","operador":"Lúcia P.","itens":[{"material":"óleo","kg_declarado":2.9,"kg_aferido":2.7,"status":"aprovado","motivo":null}],"total_kg":2.7,"pontos":41}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (40, 'ECO-S4YVZ', '00000000-0000-4000-8000-000000000006', 4, 'agendada', (privado.hoje_local() + -20),
   '19:00', '19:30', '[{"material":"metal","kg_declarado":6.8,"kg_aferido":null,"status":"pendente","motivo":null}]'::jsonb, 'nao_compareceu', null,
   null, (now() + interval '-32464 minutes'), now(),
   (now() + interval '-32344 minutes'), null, null, false,
   null, 0, 'null'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (41, 'ECO-3PZYY', '00000000-0000-4000-8000-000000000005', 5, 'agendada', (privado.hoje_local() + -19),
   '12:00', '12:30', '[{"material":"plástico","kg_declarado":7,"kg_aferido":7.5,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-30784 minutes'), now(),
   (now() + interval '-30689 minutes'), (now() + interval '-27898 minutes'), null, false,
   '00000000-0000-4000-8000-000000000016', 75, '{"numero":"ECO-3PZYY","emitido_em":"2026-11-04T12:06:00.000Z","ponto":"EcoStation Tijuca","operador":"Lúcia P.","itens":[{"material":"plástico","kg_declarado":7,"kg_aferido":7.5,"status":"aprovado","motivo":null}],"total_kg":7.5,"pontos":75}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (42, 'ECO-38JSM', '00000000-0000-4000-8000-000000000007', 2, 'agendada', (privado.hoje_local() + -19),
   '16:30', '17:00', '[{"material":"eletrônicos","kg_declarado":1.9,"kg_aferido":null,"status":"pendente","motivo":null},{"material":"pilhas","kg_declarado":1.1,"kg_aferido":null,"status":"pendente","motivo":null}]'::jsonb, 'cancelada', 'Tive um imprevisto',
   null, (now() + interval '-32464 minutes'), now(),
   null, null, null, false,
   null, 0, 'null'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (43, 'ECO-47HPJ', '00000000-0000-4000-8000-000000000005', 5, 'agendada', (privado.hoje_local() + -12),
   '09:00', '09:30', '[{"material":"eletrônicos","kg_declarado":3.3,"kg_aferido":null,"status":"pendente","motivo":null},{"material":"óleo","kg_declarado":1.1,"kg_aferido":null,"status":"pendente","motivo":null}]'::jsonb, 'recusada', 'Agenda lotada nesse horário',
   null, (now() + interval '-19504 minutes'), now(),
   null, null, null, false,
   null, 0, 'null'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (44, 'ECO-SE3TW', '00000000-0000-4000-8000-000000000002', 2, 'agendada', (privado.hoje_local() + -10),
   '11:00', '11:30', '[{"material":"pilhas","kg_declarado":0.9,"kg_aferido":null,"status":"pendente","motivo":null},{"material":"eletrônicos","kg_declarado":1.1,"kg_aferido":null,"status":"pendente","motivo":null}]'::jsonb, 'cancelada', 'Tive um imprevisto',
   null, (now() + interval '-19504 minutes'), now(),
   null, null, null, false,
   null, 0, 'null'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (45, 'ECO-Q8GLJ', '00000000-0000-4000-8000-000000000006', 4, 'agendada', (privado.hoje_local() + -10),
   '18:30', '19:00', '[{"material":"metal","kg_declarado":2.3,"kg_aferido":2.5,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-17434 minutes'), now(),
   (now() + interval '-17339 minutes'), (now() + interval '-14529 minutes'), null, false,
   '00000000-0000-4000-8000-000000000011', 30, '{"numero":"ECO-Q8GLJ","emitido_em":"2026-11-13T18:55:00.000Z","ponto":"Recicla Pinheiros","operador":"Marcos L.","itens":[{"material":"metal","kg_declarado":2.3,"kg_aferido":2.5,"status":"aprovado","motivo":null}],"total_kg":2.5,"pontos":30}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (46, 'ECO-X7NE3', '00000000-0000-4000-8000-000000000006', 4, 'agendada', (privado.hoje_local() + -10),
   '10:30', '11:00', '[{"material":"metal","kg_declarado":1.2,"kg_aferido":null,"status":"pendente","motivo":null}]'::jsonb, 'nao_compareceu', null,
   null, (now() + interval '-18064 minutes'), now(),
   (now() + interval '-17944 minutes'), null, null, false,
   null, 0, 'null'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (47, 'ECO-9GH7W', '00000000-0000-4000-8000-000000000007', 1, 'agendada', (privado.hoje_local() + -10),
   '17:30', '18:00', '[{"material":"plástico","kg_declarado":6.7,"kg_aferido":6.9,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-17494 minutes'), now(),
   (now() + interval '-17399 minutes'), (now() + interval '-14605 minutes'), null, false,
   '00000000-0000-4000-8000-000000000011', 69, '{"numero":"ECO-9GH7W","emitido_em":"2026-11-13T17:39:00.000Z","ponto":"EcoPonto Centro","operador":"Marcos L.","itens":[{"material":"plástico","kg_declarado":6.7,"kg_aferido":6.9,"status":"aprovado","motivo":null}],"total_kg":6.9,"pontos":69}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (48, 'ECO-4NEAP', '00000000-0000-4000-8000-000000000004', 4, 'agendada', (privado.hoje_local() + -7),
   '12:30', '13:00', '[{"material":"papelão","kg_declarado":4,"kg_aferido":3.5,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-13474 minutes'), now(),
   (now() + interval '-13379 minutes'), (now() + interval '-10588 minutes'), null, false,
   '00000000-0000-4000-8000-000000000011', 25, '{"numero":"ECO-4NEAP","emitido_em":"2026-11-16T12:36:00.000Z","ponto":"Recicla Pinheiros","operador":"Marcos L.","itens":[{"material":"papelão","kg_declarado":4,"kg_aferido":3.5,"status":"aprovado","motivo":null}],"total_kg":3.5,"pontos":25}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (49, 'ECO-Y5GV7', '00000000-0000-4000-8000-000000000001', 7, 'agendada', (privado.hoje_local() + -6),
   '12:00', '12:30', '[{"material":"papel","kg_declarado":8.9,"kg_aferido":9.3,"status":"aprovado","motivo":null},{"material":"plástico","kg_declarado":2.8,"kg_aferido":null,"status":"rejeitado","motivo":"Material sujo ou contaminado"}]'::jsonb, 'concluida', null,
   null, (now() + interval '-12064 minutes'), now(),
   (now() + interval '-11969 minutes'), (now() + interval '-9167 minutes'), null, false,
   '00000000-0000-4000-8000-000000000015', 74, '{"numero":"ECO-Y5GV7","emitido_em":"2026-11-17T12:17:00.000Z","ponto":"Cooperativa Mooca","operador":"Sérgio A.","itens":[{"material":"papel","kg_declarado":8.9,"kg_aferido":9.3,"status":"aprovado","motivo":null},{"material":"plástico","kg_declarado":2.8,"kg_aferido":null,"status":"rejeitado","motivo":"Material sujo ou contaminado"}],"total_kg":9.3,"pontos":74}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (50, 'ECO-JMYEM', '00000000-0000-4000-8000-000000000002', 2, 'agendada', (privado.hoje_local() + -5),
   '14:00', '14:30', '[{"material":"pilhas","kg_declarado":1.4,"kg_aferido":1.5,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-10504 minutes'), now(),
   (now() + interval '-10409 minutes'), (now() + interval '-7604 minutes'), null, false,
   '00000000-0000-4000-8000-000000000012', 38, '{"numero":"ECO-JMYEM","emitido_em":"2026-11-18T14:20:00.000Z","ponto":"Coleta Vila Madalena","operador":"Paula S.","itens":[{"material":"pilhas","kg_declarado":1.4,"kg_aferido":1.5,"status":"aprovado","motivo":null}],"total_kg":1.5,"pontos":38}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (51, 'ECO-C8CPG', '00000000-0000-4000-8000-000000000005', 5, 'agendada', (privado.hoje_local() + -5),
   '16:30', '17:00', '[{"material":"papel","kg_declarado":5.5,"kg_aferido":4.9,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-10354 minutes'), now(),
   (now() + interval '-10259 minutes'), (now() + interval '-7450 minutes'), null, false,
   '00000000-0000-4000-8000-000000000016', 39, '{"numero":"ECO-C8CPG","emitido_em":"2026-11-18T16:54:00.000Z","ponto":"EcoStation Tijuca","operador":"Lúcia P.","itens":[{"material":"papel","kg_declarado":5.5,"kg_aferido":4.9,"status":"aprovado","motivo":null}],"total_kg":4.9,"pontos":39}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (52, 'ECO-K98E8', '00000000-0000-4000-8000-000000000007', 4, 'agendada', (privado.hoje_local() + -5),
   '14:00', '14:30', '[{"material":"papel","kg_declarado":1.7,"kg_aferido":1.7,"status":"aprovado","motivo":null}]'::jsonb, 'contestada', null,
   null, (now() + interval '-10504 minutes'), now(),
   (now() + interval '-10409 minutes'), (now() + interval '-7604 minutes'), null, false,
   '00000000-0000-4000-8000-000000000011', 14, '{"numero":"ECO-K98E8","emitido_em":"2026-11-18T14:20:00.000Z","ponto":"Recicla Pinheiros","operador":"Marcos L.","itens":[{"material":"papel","kg_declarado":1.7,"kg_aferido":1.7,"status":"aprovado","motivo":null}],"total_kg":1.7,"pontos":14}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (53, 'ECO-F9V52', '00000000-0000-4000-8000-000000000001', 1, 'agendada', (privado.hoje_local() + -3),
   '09:30', '10:00', '[{"material":"vidro","kg_declarado":3.2,"kg_aferido":3.1,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-7894 minutes'), now(),
   (now() + interval '-7799 minutes'), (now() + interval '-4996 minutes'), null, false,
   '00000000-0000-4000-8000-000000000011', 19, '{"numero":"ECO-F9V52","emitido_em":"2026-11-20T09:48:00.000Z","ponto":"EcoPonto Centro","operador":"Marcos L.","itens":[{"material":"vidro","kg_declarado":3.2,"kg_aferido":3.1,"status":"aprovado","motivo":null}],"total_kg":3.1,"pontos":19}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (54, 'ECO-S598B', '00000000-0000-4000-8000-000000000003', 5, 'agendada', (privado.hoje_local() + -3),
   '11:30', '12:00', '[{"material":"óleo","kg_declarado":2.8,"kg_aferido":3,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-7774 minutes'), now(),
   (now() + interval '-7679 minutes'), (now() + interval '-4885 minutes'), null, false,
   '00000000-0000-4000-8000-000000000016', 45, '{"numero":"ECO-S598B","emitido_em":"2026-11-20T11:39:00.000Z","ponto":"EcoStation Tijuca","operador":"Lúcia P.","itens":[{"material":"óleo","kg_declarado":2.8,"kg_aferido":3,"status":"aprovado","motivo":null}],"total_kg":3,"pontos":45}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (55, 'ECO-P2P6U', '00000000-0000-4000-8000-000000000004', 1, 'agendada', (privado.hoje_local() + -3),
   '10:30', '11:00', '[{"material":"plástico","kg_declarado":8.7,"kg_aferido":8.6,"status":"aprovado","motivo":null},{"material":"vidro","kg_declarado":4.7,"kg_aferido":4.9,"status":"aprovado","motivo":null}]'::jsonb, 'concluida', null,
   null, (now() + interval '-7834 minutes'), now(),
   (now() + interval '-7739 minutes'), (now() + interval '-4947 minutes'), null, false,
   '00000000-0000-4000-8000-000000000011', 115, '{"numero":"ECO-P2P6U","emitido_em":"2026-11-20T10:37:00.000Z","ponto":"EcoPonto Centro","operador":"Marcos L.","itens":[{"material":"plástico","kg_declarado":8.7,"kg_aferido":8.6,"status":"aprovado","motivo":null},{"material":"vidro","kg_declarado":4.7,"kg_aferido":4.9,"status":"aprovado","motivo":null}],"total_kg":13.5,"pontos":115}'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (56, 'ECO-NG8NV', '00000000-0000-4000-8000-000000000004', 1, 'agendada', (privado.hoje_local() + 0),
   '17:30', '18:00', '[{"material":"plástico","kg_declarado":4.9,"kg_aferido":null,"status":"pendente","motivo":null},{"material":"vidro","kg_declarado":3.5,"kg_aferido":null,"status":"pendente","motivo":null}]'::jsonb, 'confirmada', null,
   (now() + interval '-214 minutes'), (now() + interval '-180 minutes'), now(),
   (now() + interval '-150 minutes'), null, null, false,
   null, 0, 'null'::jsonb);
insert into public.coleta_codigos (coleta_id, codigo_entrega) values (56, '3925');
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (57, 'ECO-ZTNRE', '00000000-0000-4000-8000-000000000003', 3, 'agendada', (privado.hoje_local() + 1),
   '18:30', '19:00', '[{"material":"plástico","kg_declarado":5.1,"kg_aferido":null,"status":"pendente","motivo":null}]'::jsonb, 'confirmada', null,
   (now() + interval '1260 minutes'), (now() + interval '-180 minutes'), now(),
   (now() + interval '-150 minutes'), null, null, false,
   null, 0, 'null'::jsonb);
insert into public.coleta_codigos (coleta_id, codigo_entrega) values (57, '6295');
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (58, 'ECO-QVTPT', '00000000-0000-4000-8000-000000000006', 1, 'agendada', (privado.hoje_local() + 1),
   '13:30', '14:00', '[{"material":"plástico","kg_declarado":5.1,"kg_aferido":null,"status":"pendente","motivo":null},{"material":"papel","kg_declarado":1.1,"kg_aferido":null,"status":"pendente","motivo":null}]'::jsonb, 'confirmada', null,
   (now() + interval '986 minutes'), (now() + interval '-180 minutes'), now(),
   (now() + interval '-150 minutes'), null, null, false,
   null, 0, 'null'::jsonb);
insert into public.coleta_codigos (coleta_id, codigo_entrega) values (58, '4222');
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (59, 'ECO-K8W2N', '00000000-0000-4000-8000-000000000007', 2, 'agendada', (privado.hoje_local() + 1),
   '16:30', '17:00', '[{"material":"eletrônicos","kg_declarado":2,"kg_aferido":null,"status":"pendente","motivo":null}]'::jsonb, 'confirmada', null,
   (now() + interval '1166 minutes'), (now() + interval '-180 minutes'), now(),
   (now() + interval '-150 minutes'), null, null, false,
   null, 0, 'null'::jsonb);
insert into public.coleta_codigos (coleta_id, codigo_entrega) values (59, '5573');
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (60, 'ECO-R3WUC', '00000000-0000-4000-8000-000000000001', 2, 'agendada', (privado.hoje_local() + 2),
   '13:30', '14:00', '[{"material":"eletrônicos","kg_declarado":1.3,"kg_aferido":null,"status":"pendente","motivo":null},{"material":"pilhas","kg_declarado":0.5,"kg_aferido":null,"status":"pendente","motivo":null}]'::jsonb, 'confirmada', null,
   (now() + interval '1260 minutes'), (now() + interval '-180 minutes'), now(),
   (now() + interval '-150 minutes'), null, null, false,
   null, 0, 'null'::jsonb);
insert into public.coleta_codigos (coleta_id, codigo_entrega) values (60, '6868');
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (61, 'ECO-4NAVN', '00000000-0000-4000-8000-000000000002', 1, 'agendada', (privado.hoje_local() + 3),
   '13:00', '13:30', '[{"material":"papel","kg_declarado":2.7,"kg_aferido":null,"status":"pendente","motivo":null}]'::jsonb, 'solicitada', null,
   (now() + interval '1260 minutes'), (now() + interval '-180 minutes'), now(),
   null, null, null, false,
   null, 0, 'null'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (62, 'ECO-Q7HA4', '00000000-0000-4000-8000-000000000001', 4, 'agendada', (privado.hoje_local() + 7),
   '12:00', '12:30', '[{"material":"papelão","kg_declarado":7.9,"kg_aferido":null,"status":"pendente","motivo":null}]'::jsonb, 'solicitada', null,
   (now() + interval '1260 minutes'), (now() + interval '-180 minutes'), now(),
   null, null, null, false,
   null, 0, 'null'::jsonb);
insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (63, 'ECO-M7FGX', '00000000-0000-4000-8000-000000000010', 4, 'agendada', (privado.hoje_local() + 7),
   '09:00', '09:30', '[{"material":"metal","kg_declarado":4.9,"kg_aferido":null,"status":"pendente","motivo":null},{"material":"papelão","kg_declarado":6,"kg_aferido":null,"status":"pendente","motivo":null}]'::jsonb, 'solicitada', null,
   (now() + interval '1260 minutes'), (now() + interval '-180 minutes'), now(),
   null, null, null, false,
   null, 0, 'null'::jsonb);
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (1, 1, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000008', null, (now() + interval '-90004 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (2, 1, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-89909 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (3, 1, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-87109 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (4, 1, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-87103 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (5, 2, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000001', null, (now() + interval '-87994 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (6, 2, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-87899 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (7, 2, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-85109 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (8, 2, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-85103 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (9, 3, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000008', null, (now() + interval '-88114 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (10, 3, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-88019 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (11, 3, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-85229 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (12, 3, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-85223 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (13, 4, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000003', null, (now() + interval '-87154 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (14, 4, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-87059 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (15, 4, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-84261 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (16, 4, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-84255 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (17, 5, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000002', null, (now() + interval '-82774 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (18, 5, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000015', null, (now() + interval '-82679 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (19, 5, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000015', null, (now() + interval '-79887 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (20, 5, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000015', null, (now() + interval '-79881 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (21, 6, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000002', null, (now() + interval '-81334 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (22, 6, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-81239 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (23, 6, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-78443 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (24, 6, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-78437 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (25, 7, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000003', null, (now() + interval '-81184 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (26, 7, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-81089 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (27, 7, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-78289 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (28, 7, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-78283 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (29, 8, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000005', null, (now() + interval '-80854 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (30, 8, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-80759 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (31, 8, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-77961 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (32, 8, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-77955 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (33, 9, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000001', null, (now() + interval '-78364 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (34, 9, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-78269 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (35, 9, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-75468 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (36, 9, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-75462 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (37, 10, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000001', null, (now() + interval '-78274 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (38, 10, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-78179 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (39, 10, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-75382 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (40, 10, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-75376 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (41, 11, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000007', null, (now() + interval '-76864 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (42, 11, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-76769 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (43, 11, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-73969 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (44, 11, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-73963 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (45, 12, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000003', null, (now() + interval '-72694 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (46, 12, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-72599 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (47, 12, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-69803 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (48, 12, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-69797 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (49, 13, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000004', null, (now() + interval '-72154 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (50, 13, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-72059 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (51, 13, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-69255 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (52, 13, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-69249 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (53, 14, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000006', null, (now() + interval '-72334 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (54, 14, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-72239 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (55, 14, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-69442 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (56, 14, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-69436 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (57, 15, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000003', null, (now() + interval '-71284 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (58, 15, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-71189 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (59, 15, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-68401 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (60, 15, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-68395 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (61, 16, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000009', null, (now() + interval '-71314 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (62, 16, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-71219 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (63, 16, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-68429 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (64, 16, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-68423 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (65, 17, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000004', null, (now() + interval '-68014 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (66, 17, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-67919 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (67, 17, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-65119 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (68, 17, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-65113 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (69, 18, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000001', null, (now() + interval '-66874 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (70, 18, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-66779 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (71, 18, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-63987 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (72, 18, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-63981 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (73, 19, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000001', null, (now() + interval '-63754 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (74, 19, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-63659 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (75, 19, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-60866 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (76, 19, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-60860 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (77, 20, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000010', null, (now() + interval '-62194 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (78, 20, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-62099 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (79, 20, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-59303 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (80, 20, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-59297 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (81, 21, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000001', null, (now() + interval '-61264 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (82, 21, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-61204 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (83, 21, 'cancelar', 'confirmada', 'cancelada', 'cidadao',
   '00000000-0000-4000-8000-000000000001', 'Tive um imprevisto', (now() + interval '-59704 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (84, 22, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000007', null, (now() + interval '-59434 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (85, 22, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-59339 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (86, 22, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-56541 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (87, 22, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-56535 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (88, 23, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000008', null, (now() + interval '-57994 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (89, 23, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-57899 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (90, 23, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-55098 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (91, 23, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-55092 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (92, 24, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000002', null, (now() + interval '-56794 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (93, 24, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000015', null, (now() + interval '-56699 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (94, 24, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000015', null, (now() + interval '-53904 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (95, 24, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000015', null, (now() + interval '-53898 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (96, 25, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000002', null, (now() + interval '-53974 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (97, 25, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-53879 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (98, 25, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-51086 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (99, 25, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-51080 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (100, 26, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000006', null, (now() + interval '-53464 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (101, 26, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-53369 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (102, 26, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-50574 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (103, 26, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-50568 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (104, 27, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000007', null, (now() + interval '-53914 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (105, 27, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-53819 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (106, 27, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-51030 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (107, 27, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-51024 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (108, 28, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000009', null, (now() + interval '-52534 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (109, 28, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-52439 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (110, 28, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-49635 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (111, 28, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-49629 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (112, 29, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000004', null, (now() + interval '-52624 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (113, 29, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000015', null, (now() + interval '-52564 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (114, 29, 'cancelar', 'confirmada', 'cancelada', 'cidadao',
   '00000000-0000-4000-8000-000000000004', 'Tive um imprevisto', (now() + interval '-51064 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (115, 30, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000004', null, (now() + interval '-49144 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (116, 30, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-49049 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (117, 30, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-46263 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (118, 30, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-46257 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (119, 31, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000005', null, (now() + interval '-49534 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (120, 31, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-49439 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (121, 31, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-46639 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (122, 31, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-46633 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (123, 32, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000002', null, (now() + interval '-47884 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (124, 32, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-47789 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (125, 32, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-45001 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (126, 32, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-44995 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (127, 33, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000001', null, (now() + interval '-46624 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (128, 33, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-46529 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (129, 33, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-43725 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (130, 33, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-43719 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (131, 34, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000003', null, (now() + interval '-46354 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (132, 34, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-46259 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (133, 34, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-43461 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (134, 34, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-43455 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (135, 35, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000002', null, (now() + interval '-42454 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (136, 35, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000015', null, (now() + interval '-42359 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (137, 35, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000015', null, (now() + interval '-39572 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (138, 35, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000015', null, (now() + interval '-39566 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (139, 36, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000003', null, (now() + interval '-41104 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (140, 36, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-41044 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (141, 36, 'cancelar', 'confirmada', 'cancelada', 'cidadao',
   '00000000-0000-4000-8000-000000000003', 'Tive um imprevisto', (now() + interval '-39544 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (142, 37, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000001', null, (now() + interval '-37864 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (143, 37, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-37769 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (144, 37, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-34975 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (145, 37, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-34969 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (146, 38, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000007', null, (now() + interval '-38074 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (147, 38, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-37979 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (148, 38, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-35182 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (149, 38, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-35176 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (150, 39, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000003', null, (now() + interval '-36694 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (151, 39, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-36599 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (152, 39, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-33804 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (153, 39, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-33798 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (154, 40, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000006', null, (now() + interval '-32464 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (155, 40, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-32344 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (156, 40, 'marcar_nao_compareceu', 'confirmada', 'nao_compareceu', 'sistema',
   null, null, (now() + interval '-28625 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (157, 41, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000005', null, (now() + interval '-30784 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (158, 41, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-30689 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (159, 41, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-27904 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (160, 41, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-27898 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (161, 42, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000007', null, (now() + interval '-32464 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (162, 42, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-32404 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (163, 42, 'cancelar', 'confirmada', 'cancelada', 'cidadao',
   '00000000-0000-4000-8000-000000000007', 'Tive um imprevisto', (now() + interval '-30904 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (164, 43, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000005', null, (now() + interval '-19504 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (165, 43, 'recusar', 'solicitada', 'recusada', 'ponto',
   '00000000-0000-4000-8000-000000000016', 'Agenda lotada nesse horário', (now() + interval '-19464 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (166, 44, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000002', null, (now() + interval '-19504 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (167, 44, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-19444 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (168, 44, 'cancelar', 'confirmada', 'cancelada', 'cidadao',
   '00000000-0000-4000-8000-000000000002', 'Tive um imprevisto', (now() + interval '-17944 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (169, 45, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000006', null, (now() + interval '-17434 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (170, 45, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-17339 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (171, 45, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-14535 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (172, 45, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-14529 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (173, 46, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000006', null, (now() + interval '-18064 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (174, 46, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-17944 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (175, 46, 'marcar_nao_compareceu', 'confirmada', 'nao_compareceu', 'sistema',
   null, null, (now() + interval '-14225 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (176, 47, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000007', null, (now() + interval '-17494 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (177, 47, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-17399 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (178, 47, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-14611 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (179, 47, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-14605 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (180, 48, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000004', null, (now() + interval '-13474 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (181, 48, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-13379 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (182, 48, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-10594 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (183, 48, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-10588 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (184, 49, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000001', null, (now() + interval '-12064 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (185, 49, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000015', null, (now() + interval '-11969 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (186, 49, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000015', null, (now() + interval '-9173 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (187, 49, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000015', null, (now() + interval '-9167 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (188, 50, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000002', null, (now() + interval '-10504 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (189, 50, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-10409 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (190, 50, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-7610 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (191, 50, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-7604 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (192, 51, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000005', null, (now() + interval '-10354 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (193, 51, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-10259 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (194, 51, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-7456 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (195, 51, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-7450 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (196, 52, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000007', null, (now() + interval '-10504 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (197, 52, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-10409 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (198, 52, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-7610 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (199, 52, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-7604 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (200, 53, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000001', null, (now() + interval '-7894 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (201, 53, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-7799 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (202, 53, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-5002 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (203, 53, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-4996 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (204, 54, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000003', null, (now() + interval '-7774 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (205, 54, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-7679 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (206, 54, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-4891 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (207, 54, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-4885 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (208, 55, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000004', null, (now() + interval '-7834 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (209, 55, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-7739 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (210, 55, 'checkin', 'confirmada', 'em_conferencia', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-4953 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (211, 55, 'concluir', 'em_conferencia', 'concluida', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-4947 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (212, 56, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000004', null, (now() + interval '-180 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (213, 56, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-150 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (214, 57, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000003', null, (now() + interval '-180 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (215, 57, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000016', null, (now() + interval '-150 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (216, 58, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000006', null, (now() + interval '-180 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (217, 58, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000011', null, (now() + interval '-150 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (218, 59, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000007', null, (now() + interval '-180 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (219, 59, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-150 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (220, 60, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000001', null, (now() + interval '-180 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (221, 60, 'aceitar', 'solicitada', 'confirmada', 'ponto',
   '00000000-0000-4000-8000-000000000012', null, (now() + interval '-150 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (222, 61, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000002', null, (now() + interval '-180 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (223, 62, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000001', null, (now() + interval '-180 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (224, 63, 'solicitar', null, 'solicitada', 'cidadao',
   '00000000-0000-4000-8000-000000000010', null, (now() + interval '-180 minutes'));
insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (225, 52, 'contestar', 'concluida', 'contestada', 'cidadao',
   '00000000-0000-4000-8000-000000000007', 'O peso registrado é menor que o real', (now() + interval '-6404 minutes'));
insert into public.recompensas (id, nome, parceiro, custo) values (1, 'Ecobag ECOLINK', 'ECOLINK', 120);
insert into public.recompensas (id, nome, parceiro, custo) values (2, 'Copo reutilizável dobrável', 'EcoStore', 180);
insert into public.recompensas (id, nome, parceiro, custo) values (3, '10% OFF produtos sustentáveis', 'Verde Loja', 90);
insert into public.recompensas (id, nome, parceiro, custo) values (4, 'R$ 10 em transporte', 'MobiCard', 150);
insert into public.recompensas (id, nome, parceiro, custo) values (5, 'Muda de árvore nativa', 'Reflora', 100);
insert into public.recompensas (id, nome, parceiro, custo) values (6, 'Oficina de compostagem', 'Composta SP', 250);
insert into public.recompensas (id, nome, parceiro, custo) values (7, '15% OFF na cafeteria', 'Café Raiz', 80);
insert into public.recompensas (id, nome, parceiro, custo) values (8, 'Kit lixeiras de separação', 'EcoStore', 400);
insert into public.resgates (id, usuario_id, recompensa_id, nome, parceiro, custo, codigo, em) values
  (1, '00000000-0000-4000-8000-000000000001', 7, '15% OFF na cafeteria', 'Café Raiz', 80, 'ECO-DEMO-2026', (now() + interval '-17564 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (1, '00000000-0000-4000-8000-000000000008', 'credito_coleta', 68, 'coleta', 1,
   'Entrega ECO-PUFW3', '00000000-0000-4000-8000-000000000016', (now() + interval '-87103 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (2, '00000000-0000-4000-8000-000000000008', 'credito_coleta', 77, 'coleta', 3,
   'Entrega ECO-8HM3Y', '00000000-0000-4000-8000-000000000016', (now() + interval '-85223 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (3, '00000000-0000-4000-8000-000000000001', 'credito_coleta', 43, 'coleta', 2,
   'Entrega ECO-87RQA', '00000000-0000-4000-8000-000000000011', (now() + interval '-85103 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (4, '00000000-0000-4000-8000-000000000003', 'credito_coleta', 38, 'coleta', 4,
   'Entrega ECO-8W2BV', '00000000-0000-4000-8000-000000000016', (now() + interval '-84255 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (5, '00000000-0000-4000-8000-000000000002', 'credito_coleta', 38, 'coleta', 5,
   'Entrega ECO-6SNWZ', '00000000-0000-4000-8000-000000000015', (now() + interval '-79881 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (6, '00000000-0000-4000-8000-000000000002', 'credito_coleta', 69, 'coleta', 6,
   'Entrega ECO-NCPLR', '00000000-0000-4000-8000-000000000012', (now() + interval '-78437 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (7, '00000000-0000-4000-8000-000000000003', 'credito_coleta', 43, 'coleta', 7,
   'Entrega ECO-3Z6Z4', '00000000-0000-4000-8000-000000000016', (now() + interval '-78283 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (8, '00000000-0000-4000-8000-000000000005', 'credito_coleta', 55, 'coleta', 8,
   'Entrega ECO-WR2ZQ', '00000000-0000-4000-8000-000000000016', (now() + interval '-77955 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (9, '00000000-0000-4000-8000-000000000001', 'credito_coleta', 28, 'coleta', 9,
   'Entrega ECO-GJ288', '00000000-0000-4000-8000-000000000011', (now() + interval '-75462 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (10, '00000000-0000-4000-8000-000000000001', 'credito_coleta', 73, 'coleta', 10,
   'Entrega ECO-A8V6H', '00000000-0000-4000-8000-000000000011', (now() + interval '-75376 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (11, '00000000-0000-4000-8000-000000000007', 'credito_coleta', 22, 'coleta', 11,
   'Entrega ECO-LPEGK', '00000000-0000-4000-8000-000000000012', (now() + interval '-73963 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (12, '00000000-0000-4000-8000-000000000003', 'credito_coleta', 103, 'coleta', 12,
   'Entrega ECO-6NNPN', '00000000-0000-4000-8000-000000000016', (now() + interval '-69797 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (13, '00000000-0000-4000-8000-000000000006', 'credito_coleta', 33, 'coleta', 14,
   'Entrega ECO-NLCJ4', '00000000-0000-4000-8000-000000000011', (now() + interval '-69436 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (14, '00000000-0000-4000-8000-000000000004', 'credito_coleta', 44, 'coleta', 13,
   'Entrega ECO-NZU3L', '00000000-0000-4000-8000-000000000011', (now() + interval '-69249 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (15, '00000000-0000-4000-8000-000000000009', 'credito_coleta', 33, 'coleta', 16,
   'Entrega ECO-4773A', '00000000-0000-4000-8000-000000000016', (now() + interval '-68423 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (16, '00000000-0000-4000-8000-000000000003', 'credito_coleta', 38, 'coleta', 15,
   'Entrega ECO-4UNUF', '00000000-0000-4000-8000-000000000016', (now() + interval '-68395 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (17, '00000000-0000-4000-8000-000000000004', 'credito_coleta', 116, 'coleta', 17,
   'Entrega ECO-CNBFZ', '00000000-0000-4000-8000-000000000012', (now() + interval '-65113 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (18, '00000000-0000-4000-8000-000000000001', 'credito_coleta', 52, 'coleta', 18,
   'Entrega ECO-2ZN8X', '00000000-0000-4000-8000-000000000012', (now() + interval '-63981 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (19, '00000000-0000-4000-8000-000000000001', 'credito_coleta', 38, 'coleta', 19,
   'Entrega ECO-3KBCV', '00000000-0000-4000-8000-000000000012', (now() + interval '-60860 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (20, '00000000-0000-4000-8000-000000000010', 'credito_coleta', 15, 'coleta', 20,
   'Entrega ECO-GMZ9P', '00000000-0000-4000-8000-000000000011', (now() + interval '-59297 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (21, '00000000-0000-4000-8000-000000000007', 'credito_coleta', 47, 'coleta', 22,
   'Entrega ECO-9R2P4', '00000000-0000-4000-8000-000000000011', (now() + interval '-56535 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (22, '00000000-0000-4000-8000-000000000008', 'credito_coleta', 53, 'coleta', 23,
   'Entrega ECO-K7CM4', '00000000-0000-4000-8000-000000000016', (now() + interval '-55092 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (23, '00000000-0000-4000-8000-000000000002', 'credito_coleta', 85, 'coleta', 24,
   'Entrega ECO-EYYSD', '00000000-0000-4000-8000-000000000015', (now() + interval '-53898 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (24, '00000000-0000-4000-8000-000000000002', 'credito_coleta', 80, 'coleta', 25,
   'Entrega ECO-576YF', '00000000-0000-4000-8000-000000000012', (now() + interval '-51080 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (25, '00000000-0000-4000-8000-000000000007', 'credito_coleta', 13, 'coleta', 27,
   'Entrega ECO-VC8ZJ', '00000000-0000-4000-8000-000000000012', (now() + interval '-51024 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (26, '00000000-0000-4000-8000-000000000006', 'credito_coleta', 23, 'coleta', 26,
   'Entrega ECO-8ZNCK', '00000000-0000-4000-8000-000000000011', (now() + interval '-50568 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (27, '00000000-0000-4000-8000-000000000009', 'credito_coleta', 26, 'coleta', 28,
   'Entrega ECO-YKWST', '00000000-0000-4000-8000-000000000016', (now() + interval '-49629 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (28, '00000000-0000-4000-8000-000000000005', 'credito_coleta', 30, 'coleta', 31,
   'Entrega ECO-SNMFW', '00000000-0000-4000-8000-000000000016', (now() + interval '-46633 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (29, '00000000-0000-4000-8000-000000000004', 'credito_coleta', 36, 'coleta', 30,
   'Entrega ECO-NPLS2', '00000000-0000-4000-8000-000000000011', (now() + interval '-46257 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (30, '00000000-0000-4000-8000-000000000002', 'credito_coleta', 27, 'coleta', 32,
   'Entrega ECO-Z6A9T', '00000000-0000-4000-8000-000000000011', (now() + interval '-44995 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (31, '00000000-0000-4000-8000-000000000001', 'credito_coleta', 30, 'coleta', 33,
   'Entrega ECO-MAFC8', '00000000-0000-4000-8000-000000000012', (now() + interval '-43719 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (32, '00000000-0000-4000-8000-000000000003', 'credito_coleta', 45, 'coleta', 34,
   'Entrega ECO-JMNRG', '00000000-0000-4000-8000-000000000016', (now() + interval '-43455 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (33, '00000000-0000-4000-8000-000000000002', 'credito_coleta', 43, 'coleta', 35,
   'Entrega ECO-32G9E', '00000000-0000-4000-8000-000000000015', (now() + interval '-39566 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (34, '00000000-0000-4000-8000-000000000007', 'credito_coleta', 103, 'coleta', 38,
   'Entrega ECO-XSM4T', '00000000-0000-4000-8000-000000000012', (now() + interval '-35176 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (35, '00000000-0000-4000-8000-000000000001', 'credito_coleta', 51, 'coleta', 37,
   'Entrega ECO-74WZM', '00000000-0000-4000-8000-000000000011', (now() + interval '-34969 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (36, '00000000-0000-4000-8000-000000000003', 'credito_coleta', 41, 'coleta', 39,
   'Entrega ECO-F86LW', '00000000-0000-4000-8000-000000000016', (now() + interval '-33798 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (37, '00000000-0000-4000-8000-000000000005', 'credito_coleta', 75, 'coleta', 41,
   'Entrega ECO-3PZYY', '00000000-0000-4000-8000-000000000016', (now() + interval '-27898 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (38, '00000000-0000-4000-8000-000000000001', 'resgate', -80, 'resgate', 1,
   '15% OFF na cafeteria', '00000000-0000-4000-8000-000000000001', (now() + interval '-17564 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (39, '00000000-0000-4000-8000-000000000007', 'credito_coleta', 69, 'coleta', 47,
   'Entrega ECO-9GH7W', '00000000-0000-4000-8000-000000000011', (now() + interval '-14605 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (40, '00000000-0000-4000-8000-000000000006', 'credito_coleta', 30, 'coleta', 45,
   'Entrega ECO-Q8GLJ', '00000000-0000-4000-8000-000000000011', (now() + interval '-14529 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (41, '00000000-0000-4000-8000-000000000004', 'credito_coleta', 25, 'coleta', 48,
   'Entrega ECO-4NEAP', '00000000-0000-4000-8000-000000000011', (now() + interval '-10588 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (42, '00000000-0000-4000-8000-000000000001', 'credito_coleta', 74, 'coleta', 49,
   'Entrega ECO-Y5GV7', '00000000-0000-4000-8000-000000000015', (now() + interval '-9167 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (43, '00000000-0000-4000-8000-000000000002', 'credito_coleta', 38, 'coleta', 50,
   'Entrega ECO-JMYEM', '00000000-0000-4000-8000-000000000012', (now() + interval '-7604 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (44, '00000000-0000-4000-8000-000000000007', 'credito_coleta', 14, 'coleta', 52,
   'Entrega ECO-K98E8', '00000000-0000-4000-8000-000000000011', (now() + interval '-7604 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (45, '00000000-0000-4000-8000-000000000005', 'credito_coleta', 39, 'coleta', 51,
   'Entrega ECO-C8CPG', '00000000-0000-4000-8000-000000000016', (now() + interval '-7450 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (46, '00000000-0000-4000-8000-000000000001', 'credito_coleta', 19, 'coleta', 53,
   'Entrega ECO-F9V52', '00000000-0000-4000-8000-000000000011', (now() + interval '-4996 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (47, '00000000-0000-4000-8000-000000000004', 'credito_coleta', 115, 'coleta', 55,
   'Entrega ECO-P2P6U', '00000000-0000-4000-8000-000000000011', (now() + interval '-4947 minutes'));
insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (48, '00000000-0000-4000-8000-000000000003', 'credito_coleta', 45, 'coleta', 54,
   'Entrega ECO-S598B', '00000000-0000-4000-8000-000000000016', (now() + interval '-4885 minutes'));
insert into public.avaliacoes (id, ponto_id, usuario_id, usuario_nome, coleta_id, verificada, nota, tags, comentario, resposta, em, criada_em) values
  (1, 4, '00000000-0000-4000-8000-000000000001', 'Ana R.', 2, true,
   4, array['Equipe atenciosa']::text[], 'Bom atendimento, poderia ter mais sinalização.', 'null'::jsonb,
   (now() + interval '-84803 minutes'), (now() + interval '-84803 minutes'));
insert into public.avaliacoes (id, ponto_id, usuario_id, usuario_nome, coleta_id, verificada, nota, tags, comentario, resposta, em, criada_em) values
  (2, 5, '00000000-0000-4000-8000-000000000003', 'Carla E.', 4, true,
   5, array['Bem sinalizado']::text[], 'Equipe muito atenciosa, voltarei sempre.', 'null'::jsonb,
   (now() + interval '-83955 minutes'), (now() + interval '-83955 minutes'));
insert into public.avaliacoes (id, ponto_id, usuario_id, usuario_nome, coleta_id, verificada, nota, tags, comentario, resposta, em, criada_em) values
  (3, 3, '00000000-0000-4000-8000-000000000003', 'Carla E.', 7, true,
   5, array['Atendimento rápido']::text[], 'Atendimento rápido e bem organizado!', 'null'::jsonb,
   (now() + interval '-77983 minutes'), (now() + interval '-77983 minutes'));
insert into public.avaliacoes (id, ponto_id, usuario_id, usuario_nome, coleta_id, verificada, nota, tags, comentario, resposta, em, criada_em) values
  (4, 2, '00000000-0000-4000-8000-000000000007', 'Gabriela T.', 11, true,
   5, array['Pesagem transparente']::text[], 'Equipe muito atenciosa, voltarei sempre.', 'null'::jsonb,
   (now() + interval '-73663 minutes'), (now() + interval '-73663 minutes'));
insert into public.avaliacoes (id, ponto_id, usuario_id, usuario_nome, coleta_id, verificada, nota, tags, comentario, resposta, em, criada_em) values
  (5, 3, '00000000-0000-4000-8000-000000000003', 'Carla E.', 12, true,
   4, array['Pesagem transparente']::text[], 'Bom atendimento, poderia ter mais sinalização.', 'null'::jsonb,
   (now() + interval '-69497 minutes'), (now() + interval '-69497 minutes'));
insert into public.avaliacoes (id, ponto_id, usuario_id, usuario_nome, coleta_id, verificada, nota, tags, comentario, resposta, em, criada_em) values
  (6, 4, '00000000-0000-4000-8000-000000000006', 'Felipe R.', 14, true,
   5, array['Equipe atenciosa']::text[], 'Atendimento rápido e bem organizado!', 'null'::jsonb,
   (now() + interval '-69136 minutes'), (now() + interval '-69136 minutes'));
insert into public.avaliacoes (id, ponto_id, usuario_id, usuario_nome, coleta_id, verificada, nota, tags, comentario, resposta, em, criada_em) values
  (7, 5, '00000000-0000-4000-8000-000000000003', 'Carla E.', 15, true,
   4, array['Atendimento rápido']::text[], 'Bom atendimento, poderia ter mais sinalização.', 'null'::jsonb,
   (now() + interval '-68095 minutes'), (now() + interval '-68095 minutes'));
insert into public.avaliacoes (id, ponto_id, usuario_id, usuario_nome, coleta_id, verificada, nota, tags, comentario, resposta, em, criada_em) values
  (8, 2, '00000000-0000-4000-8000-000000000004', 'Diego S.', 17, true,
   5, array['Bem sinalizado']::text[], 'Aceitam vários materiais, super recomendo.', 'null'::jsonb,
   (now() + interval '-64813 minutes'), (now() + interval '-64813 minutes'));
insert into public.avaliacoes (id, ponto_id, usuario_id, usuario_nome, coleta_id, verificada, nota, tags, comentario, resposta, em, criada_em) values
  (9, 1, '00000000-0000-4000-8000-000000000007', 'Gabriela T.', 22, true,
   4, array['Fácil de chegar']::text[], 'Bem localizado e horário amplo.', '{"texto":"Obrigado pela visita e pela separação caprichada! Volte sempre. 🌱","em":"2026-10-15T21:49:00.000Z"}'::jsonb,
   (now() + interval '-56235 minutes'), (now() + interval '-56235 minutes'));
insert into public.avaliacoes (id, ponto_id, usuario_id, usuario_nome, coleta_id, verificada, nota, tags, comentario, resposta, em, criada_em) values
  (10, 7, '00000000-0000-4000-8000-000000000002', 'Bruno V.', 24, true,
   5, array['Pesagem transparente']::text[], 'Aceitam vários materiais, super recomendo.', 'null'::jsonb,
   (now() + interval '-53598 minutes'), (now() + interval '-53598 minutes'));
insert into public.avaliacoes (id, ponto_id, usuario_id, usuario_nome, coleta_id, verificada, nota, tags, comentario, resposta, em, criada_em) values
  (11, 2, '00000000-0000-4000-8000-000000000002', 'Bruno V.', 25, true,
   4, array['Pesagem transparente']::text[], 'Bem localizado e horário amplo.', 'null'::jsonb,
   (now() + interval '-50780 minutes'), (now() + interval '-50780 minutes'));
insert into public.avaliacoes (id, ponto_id, usuario_id, usuario_nome, coleta_id, verificada, nota, tags, comentario, resposta, em, criada_em) values
  (12, 4, '00000000-0000-4000-8000-000000000004', 'Diego S.', 30, true,
   4, array['Fácil de chegar']::text[], 'Bom atendimento, poderia ter mais sinalização.', 'null'::jsonb,
   (now() + interval '-45957 minutes'), (now() + interval '-45957 minutes'));
insert into public.avaliacoes (id, ponto_id, usuario_id, usuario_nome, coleta_id, verificada, nota, tags, comentario, resposta, em, criada_em) values
  (13, 4, '00000000-0000-4000-8000-000000000002', 'Bruno V.', 32, true,
   5, array['Equipe atenciosa']::text[], 'Atendimento rápido e bem organizado!', 'null'::jsonb,
   (now() + interval '-44695 minutes'), (now() + interval '-44695 minutes'));
insert into public.avaliacoes (id, ponto_id, usuario_id, usuario_nome, coleta_id, verificada, nota, tags, comentario, resposta, em, criada_em) values
  (14, 2, '00000000-0000-4000-8000-000000000001', 'Ana R.', 33, true,
   4, array['Fácil de chegar']::text[], 'Bem localizado e horário amplo.', 'null'::jsonb,
   (now() + interval '-43419 minutes'), (now() + interval '-43419 minutes'));
insert into public.avaliacoes (id, ponto_id, usuario_id, usuario_nome, coleta_id, verificada, nota, tags, comentario, resposta, em, criada_em) values
  (15, 1, '00000000-0000-4000-8000-000000000001', 'Ana R.', 37, true,
   5, array['Equipe atenciosa']::text[], 'Perfeito, tudo muito limpo e sinalizado.', '{"texto":"Obrigado pela visita e pela separação caprichada! Volte sempre. 🌱","em":"2026-10-30T21:15:00.000Z"}'::jsonb,
   (now() + interval '-34669 minutes'), (now() + interval '-34669 minutes'));
insert into public.avaliacoes (id, ponto_id, usuario_id, usuario_nome, coleta_id, verificada, nota, tags, comentario, resposta, em, criada_em) values
  (16, 2, '00000000-0000-4000-8000-000000000007', 'Gabriela T.', 38, true,
   3, array['Atendimento ruim']::text[], 'Funciona, mas o acesso é meio confuso.', 'null'::jsonb,
   (now() + interval '-34876 minutes'), (now() + interval '-34876 minutes'));
insert into public.avaliacoes (id, ponto_id, usuario_id, usuario_nome, coleta_id, verificada, nota, tags, comentario, resposta, em, criada_em) values
  (17, 5, '00000000-0000-4000-8000-000000000003', 'Carla E.', 39, true,
   5, array['Equipe atenciosa']::text[], 'Atendimento rápido e bem organizado!', 'null'::jsonb,
   (now() + interval '-33498 minutes'), (now() + interval '-33498 minutes'));
insert into public.avaliacoes (id, ponto_id, usuario_id, usuario_nome, coleta_id, verificada, nota, tags, comentario, resposta, em, criada_em) values
  (18, 5, '00000000-0000-4000-8000-000000000005', 'Elisa N.', 41, true,
   5, array['Equipe atenciosa']::text[], 'Aceitam vários materiais, super recomendo.', 'null'::jsonb,
   (now() + interval '-27598 minutes'), (now() + interval '-27598 minutes'));
insert into public.avaliacoes (id, ponto_id, usuario_id, usuario_nome, coleta_id, verificada, nota, tags, comentario, resposta, em, criada_em) values
  (19, 1, '00000000-0000-4000-8000-000000000007', 'Gabriela T.', 47, true,
   5, array['Bem sinalizado']::text[], 'Perfeito, tudo muito limpo e sinalizado.', '{"texto":"Obrigado pela visita e pela separação caprichada! Volte sempre. 🌱","em":"2026-11-14T00:39:00.000Z"}'::jsonb,
   (now() + interval '-14305 minutes'), (now() + interval '-14305 minutes'));
insert into public.avaliacoes (id, ponto_id, usuario_id, usuario_nome, coleta_id, verificada, nota, tags, comentario, resposta, em, criada_em) values
  (20, 4, '00000000-0000-4000-8000-000000000004', 'Diego S.', 48, true,
   5, array['Fácil de chegar']::text[], 'Equipe muito atenciosa, voltarei sempre.', 'null'::jsonb,
   (now() + interval '-10288 minutes'), (now() + interval '-10288 minutes'));
insert into public.notificacoes (usuario_id, tipo, icone, texto, lida, em) values
  ('00000000-0000-4000-8000-000000000001', 'coleta', '♻️', 'Entrega de vidro conferida no EcoPonto Centro. +19 EcoPontos!', true, (now() + interval '-1679 minutes'));
insert into public.notificacoes (usuario_id, tipo, icone, texto, lida, em) values
  ('00000000-0000-4000-8000-000000000001', 'lembrete', '📅', 'Entrega confirmada no Coleta Vila Madalena. Mostre o código de entrega na chegada.', false, (now() + interval '-784 minutes'));
insert into public.notificacoes (usuario_id, tipo, icone, texto, lida, em) values
  ('00000000-0000-4000-8000-000000000001', 'recompensa', '🎁', 'Você já tem EcoPontos para resgatar recompensas na loja!', false, (now() + interval '-3034 minutes'));
do $$ begin
  perform setval(pg_get_serial_sequence('public.organizacoes', 'id'), coalesce((select max(id) from public.organizacoes), 1));
  perform setval(pg_get_serial_sequence('public.pontos', 'id'), coalesce((select max(id) from public.pontos), 1));
  perform setval(pg_get_serial_sequence('public.membros', 'id'), coalesce((select max(id) from public.membros), 1));
  perform setval(pg_get_serial_sequence('public.coletas', 'id'), coalesce((select max(id) from public.coletas), 1));
  perform setval(pg_get_serial_sequence('public.coleta_eventos', 'id'), coalesce((select max(id) from public.coleta_eventos), 1));
  perform setval(pg_get_serial_sequence('public.extrato', 'id'), coalesce((select max(id) from public.extrato), 1));
  perform setval(pg_get_serial_sequence('public.avaliacoes', 'id'), coalesce((select max(id) from public.avaliacoes), 1));
  perform setval(pg_get_serial_sequence('public.resgates', 'id'), coalesce((select max(id) from public.resgates), 1));
end $$;
commit;
