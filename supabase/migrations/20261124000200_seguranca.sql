-- ECOLINK no Supabase — 2/4: SEGURANÇA (RLS em TODAS as tabelas)
--
-- A chave "anon" fica visível no navegador. Por isso:
--   1. RLS ligada em todas as tabelas: cada linha só é lida por quem tem direito;
--   2. nenhuma escrita direta nas tabelas sensíveis (coletas, extrato, equipe…):
--      tudo passa por funções do servidor (3/4), que aplicam as regras;
--   3. privilégios por COLUNA onde a linha é da própria pessoa (perfil): dá para
--      mudar o nome, nunca os papéis.
-- É a matriz de src/domain/permissoes.js, agora dentro do banco.

create schema if not exists privado;
grant usage on schema privado to anon, authenticated;

-- ------------------------------------------------------------- ajudantes --

create or replace function privado.tem_papel(p text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and status = 'ativo' and p = any (papeis)
  );
$$;

create or replace function privado.eh_plataforma() returns boolean
language sql stable security definer set search_path = '' as $$
  select privado.tem_papel('admin') or privado.tem_papel('moderador');
$$;

create or replace function privado.eh_membro(p_ponto bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.membros m join public.perfis u on u.id = m.usuario_id
    where m.ponto_id = p_ponto and m.usuario_id = auth.uid() and m.ativo and u.status = 'ativo'
  );
$$;

create or replace function privado.eh_gestor(p_ponto bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.membros
    where ponto_id = p_ponto and usuario_id = auth.uid() and ativo and papel = 'gestor'
  );
$$;

-- Só os ajudantes usados nas políticas de RLS podem ser executados por quem
-- usa a API; os demais (3/4) ficam restritos ao dono (revogados lá).
grant execute on function privado.tem_papel(text), privado.eh_plataforma(),
  privado.eh_membro(bigint), privado.eh_gestor(bigint) to anon, authenticated;

-- ------------------------------------------------- conta nova → perfil --

-- Toda conta criada no Supabase Auth ganha um perfil de CIDADÃO. Papéis vindos
-- do cadastro (raw_user_meta_data) são ignorados: ninguém se cadastra como admin.
create or replace function privado.criar_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfis (id, nome, email, telefone, cidade, codigo_pessoal, aceite_termos)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'telefone'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'cidade'), ''),
    upper(substr(translate(encode(extensions.gen_random_bytes(12), 'base64'), '+/=01OIlo', ''), 1, 8)),
    case when new.raw_user_meta_data ? 'termos'
      then jsonb_build_object('versao', new.raw_user_meta_data ->> 'termos', 'em', now()) end
  );
  return new;
end $$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function privado.criar_perfil();

-- ---------------------------------------------------------------- RLS --

alter table public.perfis enable row level security;
alter table public.materiais enable row level security;
alter table public.organizacoes enable row level security;
alter table public.pontos enable row level security;
alter table public.membros enable row level security;
alter table public.coletas enable row level security;
alter table public.coleta_codigos enable row level security;
alter table public.coleta_eventos enable row level security;
alter table public.extrato enable row level security;
alter table public.notificacoes enable row level security;
alter table public.avaliacoes enable row level security;
alter table public.auditoria enable row level security;

-- Defesa em profundidade: além da RLS, tira as escritas diretas de quem usa a API.
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke insert, update, delete, truncate, references, trigger on tables from anon, authenticated;

-- perfis: cada um lê o próprio; a plataforma lê todos. Edita só alguns campos.
create policy perfis_ler on public.perfis for select
  using (id = auth.uid() or privado.eh_plataforma());
create policy perfis_editar on public.perfis for update
  using (id = auth.uid()) with check (id = auth.uid());
grant update (nome, telefone, cidade, boas_vindas) on public.perfis to authenticated; -- perfil ativo: função trocar_perfil

-- materiais: catálogo público.
create policy materiais_ler on public.materiais for select using (true);

-- organizações: as aprovadas são públicas (nome/tipo no selo "parceiro verificado").
create policy organizacoes_ler on public.organizacoes for select
  using (status = 'aprovada' or responsavel_id = auth.uid() or privado.eh_plataforma());

-- pontos: os que estão no mapa são públicos; a equipe vê os seus em qualquer situação.
create policy pontos_ler on public.pontos for select
  using (status in ('ativo', 'pausado') or privado.eh_membro(id) or privado.eh_plataforma());

-- equipe: a própria participação e os colegas do mesmo ponto.
create policy membros_ler on public.membros for select
  using (usuario_id = auth.uid() or privado.eh_membro(ponto_id) or privado.eh_plataforma());

-- coletas: o cidadão vê as suas; a plataforma vê todas. A EQUIPE do ponto não lê
-- a tabela: usa recebimentos_do_ponto()/coleta_do_ponto(), que trocam o id do
-- cidadão pelo nome reduzido ("Ana R.") — minimização de dados.
create policy coletas_ler on public.coletas for select
  using (usuario_id = auth.uid() or privado.eh_plataforma());

-- código de entrega: SÓ o dono da coleta (nem a equipe, nem a plataforma).
create policy codigos_ler on public.coleta_codigos for select
  using (exists (select 1 from public.coletas c where c.id = coleta_id and c.usuario_id = auth.uid()));

create policy eventos_ler on public.coleta_eventos for select
  using (exists (
    select 1 from public.coletas c
    where c.id = coleta_id and (c.usuario_id = auth.uid() or privado.eh_plataforma())
  ));
-- Sem ator_id: o cidadão vê "o ponto aceitou", não QUEM da equipe.
revoke select on public.coleta_eventos from anon, authenticated;
grant select (id, coleta_id, acao, de, para, ator, motivo, em) on public.coleta_eventos to authenticated;

-- extrato: cada um vê o seu. Não há política de escrita: só funções do servidor lançam.
create policy extrato_ler on public.extrato for select
  using (usuario_id = auth.uid() or privado.eh_plataforma());

-- notificações: as próprias; pode marcar como lida.
create policy notificacoes_ler on public.notificacoes for select using (usuario_id = auth.uid());
create policy notificacoes_marcar on public.notificacoes for update
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
grant update (lida) on public.notificacoes to authenticated;

-- avaliações: públicas (sem o id de quem avaliou — ver grants por coluna abaixo).
create policy avaliacoes_ler on public.avaliacoes for select
  using (removida is null or usuario_id = auth.uid() or privado.eh_plataforma());
revoke select on public.avaliacoes from anon, authenticated;
grant select (id, ponto_id, usuario_nome, verificada, nota, tags, comentario, resposta, em)
  on public.avaliacoes to anon, authenticated;

-- auditoria: só a plataforma lê; ninguém escreve pela API.
create policy auditoria_ler on public.auditoria for select using (privado.eh_plataforma());

-- Funções novas (3/4) são liberadas uma a uma; o padrão é ninguém executar.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
