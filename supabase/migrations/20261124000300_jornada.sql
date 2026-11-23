-- ECOLINK no Supabase — 3/4: FUNÇÕES DA JORNADA (security definer)
--
-- A máquina de estados da coleta (src/domain/coletaMaquina.js) no servidor.
-- O cliente nunca escreve em coletas, códigos ou extrato: chama estas funções,
-- que conferem QUEM está pedindo (auth.uid()) e O QUÊ pode ser feito.
--
-- Erros usam o código "PTxxx" do PostgREST, que vira o status HTTP xxx
-- (403 sem permissão, 404 não encontrado, 409 conflito, 422 inválido, 429 limite).

-- ------------------------------------------------------------- ajudantes --

create or replace function privado.erro(p_status integer, p_mensagem text) returns void
language plpgsql as $$
begin
  raise exception using errcode = 'PT' || p_status, message = p_mensagem;
end $$;

create or replace function privado.agora_local() returns timestamp
language sql stable as $$ select (now() at time zone 'America/Sao_Paulo') $$;

create or replace function privado.hoje_local() returns date
language sql stable as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;

-- Instante (com fuso) de uma data + "HH:MM" no horário de Brasília.
create or replace function privado.instante(p_data date, p_hora text) returns timestamptz
language sql immutable as $$ select (p_data + p_hora::time) at time zone 'America/Sao_Paulo' $$;

create or replace function privado.nome_reduzido(p_nome text) returns text
language sql immutable as $$
  select case
    when p_nome is null then '—'
    when array_length(regexp_split_to_array(trim(p_nome), '\s+'), 1) = 1 then trim(p_nome)
    else split_part(trim(p_nome), ' ', 1) || ' ' ||
         upper(left((regexp_split_to_array(trim(p_nome), '\s+'))[array_length(regexp_split_to_array(trim(p_nome), '\s+'), 1)], 1)) || '.'
  end
$$;

create or replace function privado.auditar(p_acao text, p_tipo text, p_id text, p_detalhes jsonb default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.auditoria (ator_id, acao, recurso_tipo, recurso_id, detalhes)
  values (auth.uid(), p_acao, p_tipo, p_id, p_detalhes);
$$;

-- Com "ref", mensagens seguidas atualizam a MESMA notificação não lida.
create or replace function privado.notificar(p_usuario uuid, p_tipo text, p_icone text, p_texto text, p_ref text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_ref is not null then
    update public.notificacoes set texto = p_texto, icone = p_icone, em = now()
      where usuario_id = p_usuario and ref = p_ref and not lida;
    if found then return; end if;
  end if;
  insert into public.notificacoes (usuario_id, tipo, icone, texto, ref)
  values (p_usuario, p_tipo, p_icone, p_texto, p_ref);
end $$;

create or replace function privado.notificar_equipe(p_ponto bigint, p_tipo text, p_icone text, p_texto text)
returns void language sql security definer set search_path = '' as $$
  select privado.notificar(m.usuario_id, p_tipo, p_icone, p_texto)
  from public.membros m where m.ponto_id = p_ponto and m.ativo;
$$;

create or replace function privado.evento(p_coleta bigint, p_acao text, p_de text, p_para text, p_ator text, p_motivo text default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.coleta_eventos (coleta_id, acao, de, para, ator, ator_id, motivo)
  values (p_coleta, p_acao, p_de, p_para, p_ator, case when p_ator in ('sistema') then null else auth.uid() end, p_motivo);
$$;

create or replace function privado.novo_codigo_coleta() returns text
language plpgsql security definer set search_path = '' as $$
declare
  alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c text;
begin
  loop
    c := 'ECO-' || (select string_agg(substr(alfabeto, 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 5));
    exit when not exists (select 1 from public.coletas where codigo = c);
  end loop;
  return c;
end $$;

create or replace function privado.novo_codigo_entrega() returns text
language sql volatile as $$ select lpad((floor(random() * 10000))::int::text, 4, '0') $$;

create or replace function privado.regra(p_ponto public.pontos, p_chave text, p_padrao text) returns text
language sql immutable as $$ select coalesce(p_ponto.regras ->> p_chave, p_padrao) $$;

-- Intervalos de funcionamento num dia (considera exceções, como em domain/horarios.js).
create or replace function privado.intervalos_do_dia(p_ponto public.pontos, p_data date) returns jsonb
language sql immutable as $$
  select coalesce(
    (select case when (e ->> 'fechado')::boolean then '[]'::jsonb else coalesce(e -> 'intervalos', '[]'::jsonb) end
       from jsonb_array_elements(p_ponto.excecoes) e where e ->> 'data' = p_data::text limit 1),
    p_ponto.horarios -> (array['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'])[extract(dow from p_data)::int + 1],
    '[]'::jsonb
  )
$$;

-- Motivo pelo qual a janela não pode ser escolhida (null = pode). Igual a problemaDaJanela.
create or replace function privado.problema_da_janela(p_ponto public.pontos, p_data date, p_inicio text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  dur int := privado.regra(p_ponto, 'janela_min', '30')::int;
  cap int := privado.regra(p_ponto, 'capacidade_janela', '3')::int;
  antecedencia int := privado.regra(p_ponto, 'antecedencia_horas', '2')::int;
  ini int;
  ok boolean := false;
  i jsonb;
  t int;
  ocupadas int;
begin
  if jsonb_array_length(privado.intervalos_do_dia(p_ponto, p_data)) = 0 then return 'O ponto não abre nesse dia.'; end if;
  if p_inicio !~ '^[0-2][0-9]:[0-5][0-9]$' then return 'Esse horário não existe na agenda do ponto.'; end if;
  ini := split_part(p_inicio, ':', 1)::int * 60 + split_part(p_inicio, ':', 2)::int;
  for i in select * from jsonb_array_elements(privado.intervalos_do_dia(p_ponto, p_data)) loop
    t := split_part(i ->> 'abre', ':', 1)::int * 60 + split_part(i ->> 'abre', ':', 2)::int;
    while t + dur <= split_part(i ->> 'fecha', ':', 1)::int * 60 + split_part(i ->> 'fecha', ':', 2)::int loop
      if t = ini then ok := true; end if;
      t := t + dur;
    end loop;
  end loop;
  if not ok then return 'Esse horário não existe na agenda do ponto.'; end if;
  if privado.instante(p_data, p_inicio) < now() + make_interval(hours => antecedencia) then
    return case when privado.instante(p_data, p_inicio) < now() then 'Horário já passou. Escolha outro horário.'
      else format('Antecedência mínima de %s h. Escolha outro horário.', antecedencia) end;
  end if;
  select count(*) into ocupadas from public.coletas
   where ponto_id = p_ponto.id and data = p_data and janela_inicio = p_inicio
     and status in ('solicitada', 'confirmada', 'em_conferencia');
  if ocupadas >= cap then return 'Esse horário lotou. Escolha outro.'; end if;
  return null;
end $$;

-- ----------------------------------------------------------- consultas --

-- Ocupação das janelas (sem dados pessoais): o cliente monta a agenda com o
-- mesmo código do modo local (domain/agenda.js).
create or replace function public.agenda_ocupacao(p_ponto bigint, p_de date, p_ate date)
returns table (data date, janela_inicio text, ocupadas integer)
language sql stable security definer set search_path = '' as $$
  select c.data, c.janela_inicio, count(*)::int
  from public.coletas c join public.pontos p on p.id = c.ponto_id
  where c.ponto_id = p_ponto and p.status in ('ativo', 'pausado')
    and c.data between p_de and p_ate and c.janela_inicio is not null
    and c.status in ('solicitada', 'confirmada', 'em_conferencia')
  group by c.data, c.janela_inicio
$$;

-- Quantas entregas o ponto já registrou (número público da página do ponto).
create or replace function public.total_coletas_do_ponto(p_ponto bigint) returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.coletas c join public.pontos p on p.id = c.ponto_id
  where c.ponto_id = p_ponto and p.status in ('ativo', 'pausado')
$$;

-- Pontos em que a pessoa trabalha, com o papel e o resumo do dia (painel do parceiro).
create or replace function public.meus_pontos() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(p) || jsonb_build_object(
    'papel', m.papel,
    'resumo', jsonb_build_object(
      'novas', (select count(*) from public.coletas c where c.ponto_id = p.id and c.status = 'solicitada'),
      'hoje', (select count(*) from public.coletas c where c.ponto_id = p.id
                 and c.status in ('confirmada', 'em_conferencia') and c.data = privado.hoje_local()),
      'proximas', (select count(*) from public.coletas c where c.ponto_id = p.id
                 and c.status = 'confirmada' and c.data > privado.hoje_local()),
      'recebidas_kg', (select coalesce(round(sum((i ->> 'kg_aferido')::numeric), 1), 0)
                 from public.coletas c, jsonb_array_elements(c.itens) i
                 where c.ponto_id = p.id and c.status in ('concluida', 'contestada', 'ajustada')
                   and i ->> 'status' = 'aprovado')
    )
  ) order by p.id), '[]'::jsonb)
  from public.membros m join public.pontos p on p.id = m.ponto_id
  where m.usuario_id = auth.uid() and m.ativo
$$;

-- Entregas de um ponto, para a equipe: sem o id do cidadão, só o nome reduzido.
create or replace function public.recebimentos_do_ponto(p_ponto bigint) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not privado.eh_membro(p_ponto) then
    perform privado.erro(403, 'Só a equipe do ponto vê os recebimentos.');
  end if;
  return coalesce((
    select jsonb_agg((to_jsonb(c) - 'usuario_id') || jsonb_build_object(
      'cidadao', privado.nome_reduzido(u.nome),
      'eu', c.usuario_id = auth.uid()
    ) order by c.data, c.janela_inicio)
    from public.coletas c join public.perfis u on u.id = c.usuario_id
    where c.ponto_id = p_ponto
  ), '[]'::jsonb);
end $$;

create or replace function public.coleta_do_ponto(p_coleta bigint) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare c public.coletas;
begin
  select * into c from public.coletas where id = p_coleta;
  if c.id is null or not privado.eh_membro(c.ponto_id) then perform privado.erro(404, 'Entrega não encontrada.'); end if;
  return (to_jsonb(c) - 'usuario_id') || jsonb_build_object(
    'cidadao', (select privado.nome_reduzido(nome) from public.perfis where id = c.usuario_id),
    'eu', c.usuario_id = auth.uid(),
    'materiais_aceitos', (select to_jsonb(materiais) from public.pontos where id = c.ponto_id),
    'eventos', coalesce((select jsonb_agg(to_jsonb(e) - 'ator_id' order by e.id) from public.coleta_eventos e where e.coleta_id = c.id), '[]'::jsonb)
  );
end $$;

-- ------------------------------------------------------------- cidadão --

create or replace function public.solicitar_coleta(p_ponto bigint, p_data date, p_janela text, p_itens jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  eu public.perfis;
  p public.pontos;
  problema text;
  item jsonb;
  itens jsonb := '[]'::jsonb;
  vistos text[] := '{}';
  kg numeric;
  limite numeric;
  nova public.coletas;
  automatico boolean;
  dur int;
begin
  select * into eu from public.perfis where id = auth.uid();
  if eu.id is null or eu.status <> 'ativo' or not ('cidadao' = any (eu.papeis)) then
    perform privado.erro(403, 'Entre no perfil Cidadão para agendar entregas.');
  end if;
  if privado.eh_membro(p_ponto) then
    perform privado.erro(403, 'Você não pode agendar entregas no ponto em que trabalha (conflito de interesse).');
  end if;
  select * into p from public.pontos where id = p_ponto and status in ('ativo', 'pausado');
  if p.id is null then perform privado.erro(404, 'Ponto de coleta não encontrado.'); end if;
  if p.status <> 'ativo' then perform privado.erro(422, 'Este ponto não está recebendo materiais no momento.'); end if;

  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    perform privado.erro(422, 'Adicione pelo menos um material.');
  end if;
  if jsonb_array_length(p_itens) > 5 then perform privado.erro(422, 'No máximo 5 materiais por entrega.'); end if;
  for item in select * from jsonb_array_elements(p_itens) loop
    if not (item ->> 'material' = any (p.materiais)) then
      perform privado.erro(422, format('Este ponto não aceita %s.', item ->> 'material'));
    end if;
    if item ->> 'material' = any (vistos) then
      perform privado.erro(422, format('%s aparece duas vezes: junte numa linha só.', item ->> 'material'));
    end if;
    vistos := vistos || (item ->> 'material');
    kg := round((item ->> 'kg')::numeric, 1);
    if kg is null or kg <= 0 then perform privado.erro(422, format('Informe quantos kg de %s.', item ->> 'material')); end if;
    if kg > 500 then perform privado.erro(422, 'A quantidade máxima por material é 500 kg.'); end if;
    limite := (p.regras_materiais -> (item ->> 'material') ->> 'limite_kg')::numeric;
    if limite is not null and kg > limite then
      perform privado.erro(422, format('Este ponto recebe até %s kg de %s por entrega.', limite, item ->> 'material'));
    end if;
    itens := itens || jsonb_build_object('material', item ->> 'material', 'kg_declarado', kg,
                                         'kg_aferido', null, 'status', 'pendente', 'motivo', null);
  end loop;

  if p_data > privado.hoje_local() + 14 then perform privado.erro(422, 'Agende com até 14 dias de antecedência.'); end if;
  problema := privado.problema_da_janela(p, p_data, p_janela);
  if problema is not null then perform privado.erro(422, problema); end if;

  if (select count(*) from public.coletas where usuario_id = eu.id
        and status in ('solicitada', 'confirmada', 'em_conferencia')) >= 3 then
    perform privado.erro(429, 'Você já tem 3 entregas em aberto. Conclua ou cancele uma antes de agendar outra.');
  end if;

  dur := privado.regra(p, 'janela_min', '30')::int;
  automatico := privado.regra(p, 'aceite_automatico', 'false')::boolean;
  insert into public.coletas (codigo, usuario_id, ponto_id, data, janela_inicio, janela_fim, itens, status, responder_ate)
  values (
    privado.novo_codigo_coleta(), eu.id, p.id, p_data, p_janela,
    to_char((p_janela::time + make_interval(mins => dur)), 'HH24:MI'), itens, 'solicitada',
    least(now() + make_interval(hours => privado.regra(p, 'prazo_resposta_horas', '24')::int), privado.instante(p_data, p_janela))
  ) returning * into nova;
  perform privado.evento(nova.id, 'solicitar', null, 'solicitada', 'cidadao');

  if automatico then
    update public.coletas set status = 'confirmada', confirmada_em = now(), atualizada_em = now() where id = nova.id;
    insert into public.coleta_codigos (coleta_id, codigo_entrega) values (nova.id, privado.novo_codigo_entrega());
    insert into public.coleta_eventos (coleta_id, acao, de, para, ator) values (nova.id, 'aceitar', 'solicitada', 'confirmada', 'sistema');
    perform privado.notificar(eu.id, 'coleta', '✅', format('Entrega confirmada no %s. Mostre o código de entrega na chegada.', p.nome));
  else
    perform privado.notificar_equipe(p.id, 'coleta', '🔔', format('Nova solicitação de entrega (%s).', nova.codigo));
  end if;
  perform privado.auditar('coleta.solicitada', 'coleta', nova.id::text);
  return nova.id;
end $$;

create or replace function public.cancelar_coleta(p_coleta bigint, p_motivo text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare c public.coletas; dono boolean; equipe boolean; tardio boolean;
begin
  select * into c from public.coletas where id = p_coleta for update;
  if c.id is null then perform privado.erro(404, 'Entrega não encontrada.'); end if;
  dono := c.usuario_id = auth.uid();
  equipe := privado.eh_membro(c.ponto_id) and not dono;
  if not (dono or equipe) then perform privado.erro(403, 'Você não pode cancelar esta entrega.'); end if;
  if c.status not in ('solicitada', 'confirmada') then
    perform privado.erro(409, 'Esta entrega não pode mais ser cancelada.');
  end if;
  if equipe and char_length(trim(coalesce(p_motivo, ''))) < 3 then perform privado.erro(422, 'Informe o motivo.'); end if;
  tardio := dono and c.status = 'confirmada' and privado.instante(c.data, c.janela_inicio) - now() < interval '2 hours';
  update public.coletas
     set status = 'cancelada', cancelada_por = case when dono then 'cidadao' else 'ponto' end,
         cancelamento_tardio = tardio, motivo = nullif(trim(p_motivo), ''), atualizada_em = now()
   where id = c.id;
  delete from public.coleta_codigos where coleta_id = c.id;
  perform privado.evento(c.id, 'cancelar', c.status, 'cancelada', case when dono then 'cidadao' else 'ponto' end, nullif(trim(p_motivo), ''));
  if dono then
    perform privado.notificar_equipe(c.ponto_id, 'coleta', '🚫', format('A entrega %s foi cancelada pelo cidadão.', c.codigo));
  else
    perform privado.notificar(c.usuario_id, 'coleta', '🚫', format('O ponto cancelou sua entrega %s: %s', c.codigo, trim(p_motivo)));
  end if;
  perform privado.auditar('coleta.cancelada', 'coleta', c.id::text, jsonb_build_object('tardio', tardio));
end $$;

-- ------------------------------------------------------ equipe do ponto --

-- Ninguém opera a própria entrega (conflito de interesse).
create or replace function privado.coleta_para_operar(p_coleta bigint) returns public.coletas
language plpgsql security definer set search_path = '' as $$
declare c public.coletas;
begin
  select * into c from public.coletas where id = p_coleta for update;
  if c.id is null or not privado.eh_membro(c.ponto_id) then perform privado.erro(404, 'Entrega não encontrada.'); end if;
  if c.usuario_id = auth.uid() then perform privado.erro(403, 'Você não pode operar a sua própria entrega.'); end if;
  return c;
end $$;

create or replace function public.aceitar_coleta(p_coleta bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.coletas;
begin
  c := privado.coleta_para_operar(p_coleta);
  if c.status <> 'solicitada' then perform privado.erro(409, 'Esta solicitação já foi respondida.'); end if;
  update public.coletas set status = 'confirmada', confirmada_em = now(), atualizada_em = now() where id = c.id;
  insert into public.coleta_codigos (coleta_id, codigo_entrega) values (c.id, privado.novo_codigo_entrega())
    on conflict (coleta_id) do update set codigo_entrega = excluded.codigo_entrega, tentativas = 0, bloqueado_ate = null;
  perform privado.evento(c.id, 'aceitar', 'solicitada', 'confirmada', 'ponto');
  perform privado.notificar(c.usuario_id, 'coleta', '✅',
    format('Sua entrega %s foi confirmada. Mostre o código de entrega na chegada.', c.codigo));
  perform privado.auditar('coleta.aceita', 'coleta', c.id::text);
end $$;

create or replace function public.recusar_coleta(p_coleta bigint, p_motivo text) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.coletas;
begin
  c := privado.coleta_para_operar(p_coleta);
  if c.status <> 'solicitada' then perform privado.erro(409, 'Esta solicitação já foi respondida.'); end if;
  if char_length(trim(coalesce(p_motivo, ''))) < 3 then perform privado.erro(422, 'Informe o motivo.'); end if;
  update public.coletas set status = 'recusada', motivo = trim(p_motivo), atualizada_em = now() where id = c.id;
  perform privado.evento(c.id, 'recusar', 'solicitada', 'recusada', 'ponto', trim(p_motivo));
  perform privado.notificar(c.usuario_id, 'coleta', '✖️', format('O ponto não pôde aceitar sua entrega %s: %s', c.codigo, trim(p_motivo)));
  perform privado.auditar('coleta.recusada', 'coleta', c.id::text);
end $$;

-- Check-in com o código de entrega. Código errado NÃO lança erro (senha errada
-- precisa ficar registrada): devolve { ok:false } e conta a tentativa.
create or replace function public.checkin_coleta(p_coleta bigint, p_codigo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.coletas; k public.coleta_codigos;
begin
  c := privado.coleta_para_operar(p_coleta);
  if c.status <> 'confirmada' then perform privado.erro(409, 'Esta entrega não está aguardando check-in.'); end if;
  if c.data <> privado.hoje_local() then perform privado.erro(409, 'O check-in só vale no dia da entrega.'); end if;
  select * into k from public.coleta_codigos where coleta_id = c.id for update;
  if k.bloqueado_ate is not null and k.bloqueado_ate > now() then
    perform privado.erro(429, 'Muitos códigos errados. Tente de novo em alguns minutos.');
  end if;
  if k.codigo_entrega is distinct from trim(coalesce(p_codigo, '')) then
    update public.coleta_codigos
       set tentativas = case when tentativas + 1 >= 5 then 0 else tentativas + 1 end,
           bloqueado_ate = case when tentativas + 1 >= 5 then now() + interval '10 minutes' else null end
     where coleta_id = c.id;
    perform privado.auditar('coleta.codigo_incorreto', 'coleta', c.id::text);
    return jsonb_build_object('ok', false, 'mensagem', 'Código de entrega incorreto.');
  end if;
  update public.coletas set status = 'em_conferencia', atualizada_em = now() where id = c.id;
  update public.coleta_codigos set tentativas = 0, bloqueado_ate = null where coleta_id = c.id;
  perform privado.evento(c.id, 'checkin', 'confirmada', 'em_conferencia', 'ponto');
  perform privado.notificar(c.usuario_id, 'coleta', '⚖️', 'Chegada confirmada: seu material está sendo conferido.');
  perform privado.auditar('coleta.checkin', 'coleta', c.id::text);
  return jsonb_build_object('ok', true);
end $$;

-- Pesagem: quem gera EcoPontos é a balança do ponto. Peso muito acima do
-- declarado pede confirmação. O crédito vai para o extrato (só de inclusão).
create or replace function public.registrar_pesagem(p_coleta bigint, p_itens jsonb, p_confirmar_divergencia boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  c public.coletas;
  p public.pontos;
  item jsonb;
  original jsonb;
  pesados jsonb := '[]'::jsonb;
  divergentes jsonb := '[]'::jsonb;
  kg numeric;
  declarado numeric;
  pontos_total numeric := 0;
  total_kg numeric := 0;
  aprovados int := 0;
  motivos text := '';
  operador text;
  novo_status text;
begin
  c := privado.coleta_para_operar(p_coleta);
  if c.status <> 'em_conferencia' then perform privado.erro(409, 'Faça o check-in antes de pesar.'); end if;
  select * into p from public.pontos where id = c.ponto_id;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    perform privado.erro(422, 'Registre pelo menos um item.');
  end if;
  for item in select * from jsonb_array_elements(p_itens) loop
    if not (item ->> 'material' = any (p.materiais)) then
      perform privado.erro(422, format('O ponto não recebe %s.', item ->> 'material'));
    end if;
    select o into original from jsonb_array_elements(c.itens) o where o ->> 'material' = item ->> 'material' limit 1;
    declarado := coalesce((original ->> 'kg_declarado')::numeric, 0);
    if item ->> 'status' = 'aprovado' then
      kg := round((item ->> 'kg_aferido')::numeric, 1);
      if kg is null or kg <= 0 or kg > 500 then
        perform privado.erro(422, format('Informe o peso aferido de %s (até 500 kg).', item ->> 'material'));
      end if;
      if declarado > 0 and kg > declarado * 1.5 and kg - declarado >= 2 then
        divergentes := divergentes || jsonb_build_object('material', item ->> 'material', 'declarado', declarado, 'aferido', kg);
      end if;
      aprovados := aprovados + 1;
      total_kg := total_kg + kg;
      pontos_total := pontos_total + kg * (select fator from public.materiais where slug = item ->> 'material');
      pesados := pesados || jsonb_build_object('material', item ->> 'material', 'kg_declarado', declarado,
                                               'kg_aferido', kg, 'status', 'aprovado', 'motivo', null);
    elsif item ->> 'status' = 'rejeitado' then
      if char_length(trim(coalesce(item ->> 'motivo', ''))) < 3 then
        perform privado.erro(422, format('Informe por que %s foi recusado.', item ->> 'material'));
      end if;
      motivos := motivos || case when motivos = '' then '' else '; ' end || trim(item ->> 'motivo');
      pesados := pesados || jsonb_build_object('material', item ->> 'material', 'kg_declarado', declarado,
                                               'kg_aferido', null, 'status', 'rejeitado', 'motivo', trim(item ->> 'motivo'));
    else
      perform privado.erro(422, format('Aprove ou recuse o item %s.', item ->> 'material'));
    end if;
  end loop;

  if jsonb_array_length(divergentes) > 0 and not p_confirmar_divergencia then
    return jsonb_build_object('ok', false, 'codigo', 'divergencia', 'divergencias', divergentes);
  end if;

  novo_status := case when aprovados > 0 then 'concluida' else 'rejeitada' end;
  select privado.nome_reduzido(nome) into operador from public.perfis where id = auth.uid();
  update public.coletas
     set itens = pesados, status = novo_status, concluida_em = now(), atualizada_em = now(),
         operador_pesagem_id = auth.uid(), pontos_creditados = round(pontos_total)::int,
         motivo = case when aprovados = 0 then motivos else null end,
         comprovante = jsonb_build_object(
           'numero', c.codigo, 'emitido_em', now(), 'ponto', p.nome, 'operador', operador,
           'itens', pesados, 'total_kg', round(total_kg, 1), 'pontos', round(pontos_total)::int)
   where id = c.id;
  perform privado.evento(c.id, case when aprovados > 0 then 'concluir' else 'rejeitar' end, 'em_conferencia', novo_status, 'ponto',
                         case when aprovados = 0 then motivos end);
  if round(pontos_total) > 0 then
    insert into public.extrato (usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por)
    values (c.usuario_id, 'credito_coleta', round(pontos_total)::int, 'coleta', c.id,
            format('Entrega %s no %s', c.codigo, p.nome), auth.uid());
  end if;
  perform privado.notificar(c.usuario_id, 'coleta', case when aprovados > 0 then '♻️' else '✖️' end,
    case when aprovados > 0
      then format('%s conferiu sua entrega: %s kg aprovados. +%s EcoPontos!', p.nome, round(total_kg, 1), round(pontos_total)::int)
      else format('%s não pôde aceitar o material: %s.', p.nome, motivos) end);
  perform privado.auditar(case when aprovados > 0 then 'coleta.concluida' else 'coleta.rejeitada' end, 'coleta', c.id::text,
    jsonb_build_object('pontos', round(pontos_total)::int, 'divergencia', jsonb_array_length(divergentes) > 0));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.alterar_recebimento(p_ponto bigint, p_recebendo boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare p public.pontos;
begin
  if not privado.eh_membro(p_ponto) then perform privado.erro(403, 'Só a equipe do ponto pode pausar o recebimento.'); end if;
  select * into p from public.pontos where id = p_ponto for update;
  if p.status not in ('ativo', 'pausado') then perform privado.erro(409, 'Este ponto não pode ser pausado agora.'); end if;
  update public.pontos set status = case when p_recebendo then 'ativo' else 'pausado' end where id = p_ponto;
  perform privado.auditar(case when p_recebendo then 'ponto.retomado' else 'ponto.pausado' end, 'ponto', p_ponto::text);
end $$;

-- ------------------------------------------------------------- conta --

create or replace function public.trocar_perfil(p_perfil text) returns void
language plpgsql security definer set search_path = '' as $$
declare papeis text[];
begin
  select u.papeis into papeis from public.perfis u where u.id = auth.uid();
  if not (
    (p_perfil = 'cidadao' and 'cidadao' = any (papeis)) or
    (p_perfil = 'parceiro' and papeis && array['parceiro_gestor', 'parceiro_operador']) or
    (p_perfil = 'admin' and papeis && array['admin', 'moderador'])
  ) then
    perform privado.erro(403, 'Você não tem acesso a este perfil.');
  end if;
  update public.perfis set ultimo_perfil = p_perfil where id = auth.uid();
  perform privado.auditar('perfil.trocado', 'usuario', auth.uid()::text, jsonb_build_object('perfil', p_perfil));
end $$;

-- Aceite (ou novo aceite) dos Termos de Uso — consentimento registrado no servidor.
create or replace function public.aceitar_termos(p_versao integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_versao is null or p_versao < 1 then perform privado.erro(422, 'Versão dos termos inválida.'); end if;
  update public.perfis set aceite_termos = jsonb_build_object('versao', p_versao, 'em', now()) where id = auth.uid();
  perform privado.auditar('termos.aceitos', 'usuario', auth.uid()::text, jsonb_build_object('versao', p_versao));
end $$;

create or replace function public.marcar_notificacoes_lidas() returns void
language sql security definer set search_path = '' as $$
  update public.notificacoes set lida = true where usuario_id = auth.uid() and not lida;
$$;

-- ------------------------------------------------ relógio (pg_cron) --

-- Expira solicitações sem resposta e marca "não compareceu" (como manutencao.js).
create or replace function public.processar_prazos() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.coletas; expiradas int := 0; faltas int := 0;
begin
  for c in select * from public.coletas where status = 'solicitada' and responder_ate <= now() for update loop
    update public.coletas set status = 'expirada', atualizada_em = now() where id = c.id;
    insert into public.coleta_eventos (coleta_id, acao, de, para, ator) values (c.id, 'expirar', 'solicitada', 'expirada', 'sistema');
    perform privado.notificar(c.usuario_id, 'lembrete', '⌛', format('O ponto não respondeu a tempo sua solicitação %s. Que tal outro ponto?', c.codigo));
    expiradas := expiradas + 1;
  end loop;
  for c in select * from public.coletas where status = 'confirmada' and data < privado.hoje_local() for update loop
    update public.coletas set status = 'nao_compareceu', atualizada_em = now() where id = c.id;
    delete from public.coleta_codigos where coleta_id = c.id;
    insert into public.coleta_eventos (coleta_id, acao, de, para, ator) values (c.id, 'marcar_nao_compareceu', 'confirmada', 'nao_compareceu', 'sistema');
    perform privado.notificar(c.usuario_id, 'lembrete', '📭', format('Não registramos sua entrega %s. Faltas seguidas reduzem sua reputação.', c.codigo));
    faltas := faltas + 1;
  end loop;
  return jsonb_build_object('expiradas', expiradas, 'nao_compareceu', faltas);
end $$;

-- ------------------------------------------------------------ acessos --

-- O Supabase dá EXECUTE em funções novas para anon/authenticated por padrão.
-- Aqui é o contrário: tira tudo e libera uma a uma, para o papel certo.
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.agenda_ocupacao(bigint, date, date) to anon, authenticated;
grant execute on function public.total_coletas_do_ponto(bigint) to anon, authenticated;
grant execute on function public.meus_pontos() to authenticated;
grant execute on function public.recebimentos_do_ponto(bigint) to authenticated;
grant execute on function public.coleta_do_ponto(bigint) to authenticated;
grant execute on function public.solicitar_coleta(bigint, date, text, jsonb) to authenticated;
grant execute on function public.cancelar_coleta(bigint, text) to authenticated;
grant execute on function public.aceitar_coleta(bigint) to authenticated;
grant execute on function public.recusar_coleta(bigint, text) to authenticated;
grant execute on function public.checkin_coleta(bigint, text) to authenticated;
grant execute on function public.registrar_pesagem(bigint, jsonb, boolean) to authenticated;
grant execute on function public.alterar_recebimento(bigint, boolean) to authenticated;
grant execute on function public.trocar_perfil(text) to authenticated;
grant execute on function public.marcar_notificacoes_lidas() to authenticated;
grant execute on function public.aceitar_termos(integer) to authenticated;
-- processar_prazos: só o servidor (service_role e o pg_cron), nunca o navegador.
revoke execute on function public.processar_prazos() from public, anon, authenticated;

-- Os ajudantes de escrita (notificar, auditar, evento…) são security definer:
-- ninguém de fora os chama diretamente. Só os da RLS seguem liberados (2/4).
revoke execute on all functions in schema privado from public, anon, authenticated;
grant execute on function privado.tem_papel(text), privado.eh_plataforma(),
  privado.eh_membro(bigint), privado.eh_gestor(bigint) to anon, authenticated;
