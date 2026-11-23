// Gera supabase/seed.sql a partir do MESMO seed do modo local (src/data/seed.js),
// para a demonstração ser idêntica nos dois modos.
//
//   npx vite-node scripts/gerar-seed-supabase.mjs
//
// As datas saem RELATIVAS ao dia em que o seed roda (hoje_local() + N dias,
// now() + N minutos): o banco nunca fica com a demo "velha".
import { writeFileSync, readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { makeSeed } from '../src/data/seed.js';
import { isoDia } from '../src/utils/datas.js';
import { RECOMPENSAS } from '../src/data/recompensas.js';

const AGORA = new Date();
const s = makeSeed({ agora: AGORA });
const HOJE = new Date(`${isoDia(AGORA)}T12:00:00`);

const uuid = (id) => `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`;
const lit = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replaceAll("'", "''")}'`);
const json = (v) => `${lit(JSON.stringify(v ?? null))}::jsonb`;
const arr = (v) => `array[${(v || []).map(lit).join(', ')}]::text[]`;
const dia = (iso) => {
  if (!iso) return 'null';
  const n = Math.round((new Date(`${iso}T12:00:00`) - HOJE) / 86_400_000);
  return `(privado.hoje_local() + ${n})`;
};
const instante = (iso) => {
  if (!iso) return 'null';
  const min = Math.round((Date.parse(iso) - AGORA.getTime()) / 60_000);
  return `(now() + interval '${min} minutes')`;
};

const out = [];
const sql = (t) => out.push(t);

sql('-- GERADO por scripts/gerar-seed-supabase.mjs a partir de src/data/seed.js. Não edite à mão.');
sql('-- Senha de todas as contas: senha123. Datas relativas ao dia em que o seed roda.');
sql('begin;');

// Contas (Supabase Auth) — o gatilho cria o perfil; depois ajustamos papéis e dados.
for (const u of s.usuarios) {
  const id = uuid(u.id);
  sql(`insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', '${id}', 'authenticated', 'authenticated', ${lit(u.email)},
  extensions.crypt('senha123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
  ${json({ nome: u.nome })}, now(), now(), '', '', '', '');`);
  sql(`insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '${id}', '${id}', ${json({ sub: id, email: u.email, email_verified: true })}, 'email', now(), now(), now());`);
  sql(`update public.perfis set papeis = ${arr(u.papeis)}, telefone = ${lit(u.telefone)}, cidade = ${lit(u.cidade)},
  codigo_pessoal = ${lit(u.codigo_pessoal)}, boas_vindas = ${json(u.boas_vindas || {})}, aceite_termos = ${json(u.aceite_termos)},
  criado_em = ${instante(u.criado_em)} where id = '${id}';`);
}

for (const o of s.organizacoes)
  sql(`insert into public.organizacoes (id, nome, tipo, documento, responsavel_id, status) values
  (${o.id}, ${lit(o.nome)}, ${lit(o.tipo)}, ${lit(o.documento)}, ${o.responsavel_id ? `'${uuid(o.responsavel_id)}'` : 'null'}, ${lit(o.status)});`);

for (const p of s.pontos)
  sql(`insert into public.pontos (id, organizacao_id, nome, descricao, endereco, cidade, latitude, longitude, instrucoes_acesso,
  materiais, regras_materiais, horarios, excecoes, regras, fotos, status, aprovado_em) values
  (${p.id}, ${p.organizacao_id ?? 'null'}, ${lit(p.nome)}, ${lit(p.descricao)}, ${lit(p.endereco)}, ${lit(p.cidade)}, ${p.latitude}, ${p.longitude},
   ${lit(p.instrucoes_acesso)}, ${arr(p.materiais)}, ${json(p.regras_materiais || {})}, ${json(p.horarios || {})},
   ${json(p.excecoes || [])}, ${json(p.regras || {})}, '[]'::jsonb, ${lit(p.status)}, ${instante(p.aprovado_em)});`);

for (const m of s.membros)
  sql(`insert into public.membros (id, ponto_id, usuario_id, papel, ativo, desde) values
  (${m.id}, ${m.ponto_id}, '${uuid(m.usuario_id)}', ${lit(m.papel)}, ${m.ativo}, ${dia(m.desde)});`);

for (const c of s.coletas) {
  sql(`insert into public.coletas (id, codigo, usuario_id, ponto_id, tipo, data, janela_inicio, janela_fim, itens, status, motivo,
  responder_ate, criada_em, atualizada_em, confirmada_em, concluida_em, cancelada_por, cancelamento_tardio, operador_pesagem_id,
  pontos_creditados, comprovante) values
  (${c.id}, ${lit(c.codigo)}, '${uuid(c.usuario_id)}', ${c.ponto_id}, ${lit(c.tipo || 'agendada')}, ${dia(c.data)},
   ${lit(c.janela_inicio)}, ${lit(c.janela_fim)}, ${json(c.itens)}, ${lit(c.status)}, ${lit(c.motivo)},
   ${instante(c.responder_ate)}, ${instante(c.criada_em) === 'null' ? 'now()' : instante(c.criada_em)}, now(),
   ${instante(c.confirmada_em)}, ${instante(c.concluida_em)}, ${lit(c.cancelada_por)}, ${Boolean(c.cancelamento_tardio)},
   ${c.operador_pesagem_id ? `'${uuid(c.operador_pesagem_id)}'` : 'null'}, ${c.pontos_creditados || 0}, ${json(c.comprovante)});`);
  if (c.status === 'confirmada' && c.codigo_entrega)
    sql(`insert into public.coleta_codigos (coleta_id, codigo_entrega) values (${c.id}, ${lit(c.codigo_entrega)});`);
}

for (const e of s.coleta_eventos)
  sql(`insert into public.coleta_eventos (id, coleta_id, acao, de, para, ator, ator_id, motivo, em) values
  (${e.id}, ${e.coleta_id}, ${lit(e.acao)}, ${lit(e.de)}, ${lit(e.para)}, ${lit(e.ator)},
   ${e.ator_id ? `'${uuid(e.ator_id)}'` : 'null'}, ${lit(e.motivo)}, ${instante(e.em)});`);

// Catálogo da loja (o custo que vale é este, no banco) e resgates já feitos.
for (const r of RECOMPENSAS)
  sql(
    `insert into public.recompensas (id, nome, parceiro, custo) values (${r.id}, ${lit(r.nome)}, ${lit(r.parceiro)}, ${r.custo});`,
  );
for (const r of s.resgates || [])
  sql(`insert into public.resgates (id, usuario_id, recompensa_id, nome, parceiro, custo, codigo, em) values
  (${r.id}, '${uuid(r.usuario_id)}', ${r.recompensa_id}, ${lit(r.nome)}, ${lit(r.parceiro)}, ${r.custo}, ${lit(r.codigo)}, ${instante(r.em)});`);

for (const l of s.extrato)
  sql(`insert into public.extrato (id, usuario_id, tipo, valor, referencia_tipo, referencia_id, descricao, criado_por, em) values
  (${l.id}, '${uuid(l.usuario_id)}', ${lit(l.tipo)}, ${l.valor}, ${lit(l.referencia_tipo)}, ${l.referencia_id ?? 'null'},
   ${lit(l.descricao)}, ${l.criado_por ? `'${uuid(l.criado_por)}'` : 'null'}, ${instante(l.em)});`);

for (const a of s.avaliacoes)
  sql(`insert into public.avaliacoes (id, ponto_id, usuario_id, usuario_nome, coleta_id, verificada, nota, tags, comentario, resposta, em, criada_em) values
  (${a.id}, ${a.ponto_id}, '${uuid(a.usuario_id)}', ${lit(a.usuario_nome)}, ${a.coleta_id ?? 'null'}, ${Boolean(a.verificada)},
   ${a.nota}, ${arr(a.tags)}, ${lit(a.comentario || '')}, ${json(a.resposta ? { texto: a.resposta.texto, em: a.resposta.em } : null)},
   ${instante(a.em)}, ${instante(a.criada_em || a.em)});`);

for (const n of s.notificacoes)
  sql(`insert into public.notificacoes (usuario_id, tipo, icone, texto, lida, em) values
  ('${uuid(n.usuario_id)}', ${lit(n.tipo)}, ${lit(n.icone)}, ${lit(n.texto)}, ${Boolean(n.lida)}, ${instante(n.em)});`);

// Sequências depois dos ids explícitos.
sql('do $$ begin');
for (const t of ['organizacoes', 'pontos', 'membros', 'coletas', 'coleta_eventos', 'extrato', 'avaliacoes', 'resgates'])
  sql(`  perform setval(pg_get_serial_sequence('public.${t}', 'id'), coalesce((select max(id) from public.${t}), 1));`);
sql('end $$;');
sql('commit;');

writeFileSync(new URL('../supabase/seed.sql', import.meta.url), `${out.join('\n')}\n`);

// ---------------------------------------------------------------------------
// Versão "sem Docker": dois arquivos para colar no SQL Editor do painel do Supabase.
const PAINEL = new URL('../supabase/painel/', import.meta.url);
mkdirSync(PAINEL, { recursive: true });
const pastaMigracoes = new URL('../supabase/migrations/', import.meta.url);
const migracoes = readdirSync(pastaMigracoes)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => `-- =================== ${f} ===================\n${readFileSync(new URL(f, pastaMigracoes), 'utf8')}`);
writeFileSync(
  new URL('1-instalar.sql', PAINEL),
  [
    '-- GERADO por scripts/gerar-seed-supabase.mjs: todas as migrações de supabase/migrations, em ordem.',
    '-- Cole no SQL Editor de um projeto Supabase NOVO e clique em Run (uma vez só).',
    '',
    ...migracoes,
  ].join('\n'),
);
writeFileSync(
  new URL('2-dados-demo.sql', PAINEL),
  [
    '-- GERADO por scripts/gerar-seed-supabase.mjs: APAGA todos os dados e contas do projeto e recria a',
    '-- demonstração (mesmo seed do modo local). Use SÓ num projeto de demonstração.',
    '-- Pode rodar de novo quando quiser "restaurar dados" (ex.: na manhã da apresentação: as datas',
    '-- são relativas ao dia em que roda, então a entrega do Diego volta a ser HOJE).',
    'begin;',
    'truncate public.auditoria, public.notificacoes, public.avaliacoes, public.resgates, public.extrato,',
    '  public.coleta_eventos, public.coleta_codigos, public.coletas, public.membros, public.pontos,',
    '  public.organizacoes, public.recompensas restart identity cascade;',
    'delete from auth.users; -- leva junto perfis e identidades',
    'commit;',
    '',
    out.join('\n'),
    '',
  ].join('\n'),
);
console.log(
  `supabase/seed.sql e supabase/painel/: ${s.usuarios.length} contas, ${s.pontos.length} pontos, ${s.coletas.length} entregas.`,
);
