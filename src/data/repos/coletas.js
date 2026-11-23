// Coletas (agendamentos de entrega de recicláveis).
//
// As mudanças de status passam por funções específicas (agendar, concluir,
// cancelar) com pré-condições — não existe "atualizar status livremente".
// ⚠️ Hoje o próprio cidadão conclui a coleta. Isso muda na Fase 3 do ROADMAP:
//    quem conclui passa a ser o ponto, após a pesagem.

import { ler, transacao } from '../storage';
import { naoEncontrado, invalido, conflito, ErroApi } from '../erros';
import { getMaterial } from '../../domain/materiais';
import { pontosDaColeta } from '../../domain/gamificacao';
import { isoDia } from '../../utils/datas';
import { chamar, proximoId } from './_rede';
import { registrarNotificacao } from './notificacoes';

export const KG_MAXIMO = 500;

function comNomes(estado, c) {
  const u = estado.usuarios.find((x) => x.id === c.usuario_id);
  const p = estado.pontos.find((x) => x.id === c.ponto_id);
  return { ...c, usuario_nome: u?.nome || '—', ponto_nome: p?.nome || '—' };
}

function buscar(estado, id) {
  const c = estado.coletas.find((x) => x.id === Number(id));
  if (!c) throw naoEncontrado('Coleta');
  return c;
}

/**
 * Lista coletas filtradas por { usuario_id, ponto_id, status }.
 * Ordem: data agendada mais recente primeiro; `ordem: 'asc'` inverte.
 */
export function listar({ usuario_id, ponto_id, status, ordem = 'desc' } = {}) {
  return chamar(() => {
    const s = ler();
    const fator = ordem === 'asc' ? -1 : 1;
    return s.coletas
      .filter(
        (c) =>
          (!usuario_id || c.usuario_id === Number(usuario_id)) &&
          (!ponto_id || c.ponto_id === Number(ponto_id)) &&
          (!status || c.status === status),
      )
      .map((c) => comNomes(s, c))
      .sort((a, b) => (a.data_agendada < b.data_agendada ? fator : a.data_agendada > b.data_agendada ? -fator : 0));
  });
}

export function obter(id) {
  return chamar(() => {
    const s = ler();
    return comNomes(s, buscar(s, id));
  });
}

export function agendar({ usuario_id, ponto_id, material, quantidade_kg, data_agendada }) {
  return chamar(() =>
    transacao((s) => {
      if (!s.usuarios.some((u) => u.id === Number(usuario_id))) throw naoEncontrado('Usuário');
      const ponto = s.pontos.find((p) => p.id === Number(ponto_id));
      if (!ponto) throw naoEncontrado('Ponto de coleta');
      if (!ponto.ativo) throw invalido('Este ponto não está recebendo materiais no momento.');
      if (!ponto.materiais.includes(material)) throw invalido(`Este ponto não aceita ${getMaterial(material).label.toLowerCase()}.`, 'material');

      const kg = Number(quantidade_kg);
      if (!Number.isFinite(kg) || kg <= 0) throw invalido('Informe uma quantidade maior que zero.', 'quantidade_kg');
      if (kg > KG_MAXIMO) throw invalido(`A quantidade máxima por agendamento é ${KG_MAXIMO} kg.`, 'quantidade_kg');

      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data_agendada))) throw invalido('Informe uma data válida.', 'data_agendada');
      if (data_agendada < isoDia(new Date())) throw invalido('A data não pode estar no passado.', 'data_agendada');

      const nova = {
        id: proximoId(s, 'coleta'),
        usuario_id: Number(usuario_id),
        ponto_id: ponto.id,
        material,
        quantidade_kg: Math.round(kg * 10) / 10,
        status: 'agendada',
        data_agendada,
      };
      s.coletas.push(nova);
      registrarNotificacao(s, usuario_id, {
        tipo: 'lembrete',
        icone: '📅',
        texto: `Coleta de ${material} agendada no ${ponto.nome}. Não esqueça de comparecer!`,
      });
      return comNomes(s, nova);
    }),
  );
}

/** Conclui a coleta e devolve { coleta, pontos } (EcoPontos que ela rendeu). */
export function concluir(id) {
  return chamar(() =>
    transacao((s) => {
      const c = buscar(s, id);
      if (c.status !== 'agendada') throw conflito('Só é possível concluir coletas agendadas.');
      c.status = 'concluida';
      const pontos = pontosDaColeta(c);
      registrarNotificacao(s, c.usuario_id, {
        tipo: 'coleta',
        icone: '♻️',
        texto: `Coleta de ${c.material} concluída. +${pontos} EcoPontos!`,
      });
      return { coleta: comNomes(s, c), pontos };
    }),
  );
}

export function cancelar(id) {
  return chamar(() =>
    transacao((s) => {
      const c = buscar(s, id);
      if (c.status !== 'agendada') throw conflito('Só é possível cancelar coletas agendadas.');
      c.status = 'cancelada';
      return comNomes(s, c);
    }),
  );
}

/** Remove do histórico. Coletas concluídas não podem ser apagadas (lastro dos EcoPontos). */
export function remover(id) {
  return chamar(() =>
    transacao((s) => {
      const c = buscar(s, id);
      if (c.status === 'concluida') throw new ErroApi(409, 'Coletas concluídas fazem parte do seu histórico e não podem ser apagadas.');
      s.coletas = s.coletas.filter((x) => x.id !== c.id);
    }),
  );
}
