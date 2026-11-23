// Coletas — lado do CIDADÃO, no modo Supabase.
// Leitura: a RLS devolve só as entregas da própria pessoa; o código de entrega
// vem de outra tabela que SÓ o dono lê. Escrita: sempre por funções do banco
// (solicitar_coleta, cancelar_coleta), que aplicam a máquina de estados.
export * from 'fonte:nao-migrado/coletas';

import { naoEncontrado } from '../../erros';
import { estimativaDaColeta } from '../../../domain/gamificacao';
import { recebendo } from '../../../domain/pontos';
import { STATUS_COLETA, STATUS_ATIVOS, acoesDisponiveis } from '../../../domain/coletaMaquina';
import { diasDisponiveis, cancelamentoTardio } from '../../../domain/agenda';
import { qrDaColeta, qrPessoal } from '../../../domain/codigos';
import { resumoHorario } from '../../../domain/horarios';
import { isoDia } from '../../../utils/datas';
import { supabase, consultar, rpc, meuId } from '../cliente';

export const KG_MAXIMO = 500;
export const MAX_ITENS = 5;
export const MAX_ATIVAS = 3;

const ROTULO_ATOR = { cidadao: 'Você', ponto: 'O ponto', sistema: 'ECOLINK', moderacao: 'Moderação' };

const SELECAO = '*, ponto:pontos(nome), entrega:coleta_codigos(codigo_entrega)';
const SELECAO_DETALHE =
  '*, ponto:pontos(id, nome, endereco, cidade, instrucoes_acesso, latitude, longitude, regras_materiais), ' +
  'entrega:coleta_codigos(codigo_entrega), eventos:coleta_eventos(id, acao, para, ator, motivo, em)';

/** Linha do banco → formato do modo local (paraCidadao). */
export function paraCidadao(linha, { detalhe = false } = {}) {
  // O código de entrega vem de coleta_codigos — que a RLS só mostra ao dono.
  const c = { ...linha, codigo_entrega: linha.entrega?.codigo_entrega ?? null };
  const r = {
    id: c.id,
    codigo: c.codigo,
    tipo: c.tipo,
    status: c.status,
    status_rotulo: STATUS_COLETA[c.status]?.rotulo,
    data: c.data,
    janela_inicio: c.janela_inicio,
    janela_fim: c.janela_fim,
    itens: c.itens,
    motivo: c.motivo,
    responder_ate: c.responder_ate || null,
    pontos_creditados: c.pontos_creditados,
    estimativa: estimativaDaColeta(c),
    ponto_id: c.ponto_id,
    ponto_nome: linha.ponto?.nome || '—',
    criada_em: c.criada_em,
    pode_cancelar: acoesDisponiveis(c, 'cidadao').includes('cancelar'),
    cancelamento_tardio: cancelamentoTardio(c),
  };
  if (c.status === 'confirmada' && c.codigo_entrega) {
    r.codigo_entrega = c.codigo_entrega;
    r.qr = qrDaColeta(c.codigo, c.codigo_entrega);
  }
  if (detalhe) {
    r.ponto = linha.ponto || null;
    r.comprovante = c.comprovante || null;
    r.pode_contestar = false; // contestação: próxima etapa da migração
    r.rastreio = null; // rastreabilidade (estoque/destinação): próxima etapa
    r.contestacao = null;
    r.eventos = (linha.eventos || [])
      .sort((a, b) => a.id - b.id)
      .map((e) => ({
        id: e.id,
        acao: e.acao,
        para: e.para,
        quem: ROTULO_ATOR[e.ator] || '—',
        motivo: e.motivo,
        em: e.em,
      }));
  }
  return r;
}

/** Entregas da própria conta, cruas (para estatísticas e reputação). */
export async function minhasColetasBrutas() {
  const id = await meuId();
  return consultar(supabase().from('coletas').select('*').eq('usuario_id', id));
}

/* ------------------------------ agenda ------------------------------- */

export async function agenda(pontoId) {
  const hoje = isoDia(new Date());
  const ate = isoDia(new Date(Date.now() + 15 * 86_400_000));
  const [p, ocupacao] = await Promise.all([
    consultar(
      supabase().from('pontos').select('*').eq('id', Number(pontoId)).in('status', ['ativo', 'pausado']).maybeSingle(),
    ),
    rpc('agenda_ocupacao', { p_ponto: Number(pontoId), p_de: hoje, p_ate: ate }, { escrita: false }),
  ]);
  if (!p) throw naoEncontrado('Ponto de coleta');
  // A ocupação chega SEM dados pessoais (só data, janela e quantidade). Viram
  // "coletas" anônimas para o mesmo cálculo de agenda do modo local.
  const ocupadas = ocupacao.flatMap((o) =>
    Array.from({ length: o.ocupadas }, () => ({
      ponto_id: p.id,
      data: o.data,
      janela_inicio: o.janela_inicio,
      status: 'confirmada',
    })),
  );
  return {
    ponto: {
      id: p.id,
      nome: p.nome,
      cidade: p.cidade,
      materiais: p.materiais,
      regras_materiais: p.regras_materiais,
      regras: p.regras,
      horario: resumoHorario(p.horarios),
      recebendo: recebendo(p),
      materiais_lotados: [],
    },
    dias: recebendo(p) ? diasDisponiveis(p, ocupadas, new Date()) : [],
  };
}

/* ---------------------------- solicitar ------------------------------ */

export async function solicitar({ ponto_id, data, janela_inicio, itens = [] }) {
  const id = await rpc('solicitar_coleta', {
    p_ponto: Number(ponto_id),
    p_data: data,
    p_janela: janela_inicio,
    p_itens: (itens || []).map(({ material, kg }) => ({ material, kg: Number(kg) })),
  });
  return obter(id);
}

/* ---------------------------- acompanhar ----------------------------- */

export async function minhas({ status, grupo, ordem = 'desc' } = {}) {
  const id = await meuId();
  const linhas = await consultar(supabase().from('coletas').select(SELECAO).eq('usuario_id', id));
  const fator = ordem === 'asc' ? 1 : -1;
  return linhas
    .filter(
      (c) => (!status || c.status === status) && (!grupo || (grupo === 'abertas') === STATUS_ATIVOS.includes(c.status)),
    )
    .sort((a, b) => fator * (`${a.data} ${a.janela_inicio || ''}` < `${b.data} ${b.janela_inicio || ''}` ? -1 : 1))
    .map((c) => paraCidadao(c));
}

export async function obter(id) {
  const linha = await consultar(supabase().from('coletas').select(SELECAO_DETALHE).eq('id', Number(id)).maybeSingle());
  if (!linha) throw naoEncontrado('Entrega');
  return paraCidadao(linha, { detalhe: true });
}

export async function cancelar(id, motivo = '') {
  await rpc('cancelar_coleta', {
    p_coleta: Number(id),
    p_motivo: String(motivo || '').trim() || 'Cancelada pelo cidadão',
  });
  return obter(id);
}

/* ---------------------- código pessoal (entrega avulsa) ---------------------- */

export async function meuCodigoPessoal() {
  const id = await meuId();
  const u = await consultar(supabase().from('perfis').select('codigo_pessoal').eq('id', id).single());
  return { codigo: u.codigo_pessoal, qr: qrPessoal(u.codigo_pessoal) };
}
