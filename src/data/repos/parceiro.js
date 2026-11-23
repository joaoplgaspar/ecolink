// Área do parceiro (gestor/operador de ponto de coleta).
//
// Escopo: cada membro só enxerga os pontos dos quais faz parte — e, dos
// cidadãos, só o MÍNIMO necessário (primeiro nome + inicial). Telefone e
// e-mail nunca saem daqui (minimização de dados, LGPD).
// Aceitar, recusar, fazer check-in e pesar chegam na Fase 3 do ROADMAP.

import { ler } from '../storage';
import { naoEncontrado } from '../erros';
import { chamarAutenticado } from './_rede';
import { exigir } from './_sessao';
import { isoDia } from '../../utils/datas';

/** "Ana Recicladora" → "Ana R." */
export function nomeReduzido(nome = '') {
  const [primeiro, ...resto] = nome.trim().split(/\s+/);
  const ultimo = resto.at(-1);
  return ultimo ? `${primeiro} ${ultimo[0]}.` : primeiro;
}

/** Pontos em que a pessoa trabalha, com o papel dela e um resumo do dia. */
export function meusPontos() {
  return chamarAutenticado((ator) => {
    exigir(ator, 'parceiro.painel', {}, 'Entre no perfil Parceiro para acessar o painel do ponto.');
    const s = ler();
    const hoje = isoDia(new Date());
    return s.membros
      .filter((m) => m.usuario_id === ator.id && m.ativo)
      .map((m) => {
        const ponto = s.pontos.find((p) => p.id === m.ponto_id);
        const doPonto = s.coletas.filter((c) => c.ponto_id === m.ponto_id);
        return {
          ...ponto,
          papel: m.papel,
          resumo: {
            hoje: doPonto.filter((c) => c.status === 'agendada' && c.data_agendada === hoje).length,
            proximas: doPonto.filter((c) => c.status === 'agendada' && c.data_agendada >= hoje).length,
            recebidas_kg:
              Math.round(
                doPonto.filter((c) => c.status === 'concluida').reduce((t, c) => t + c.quantidade_kg, 0) * 10,
              ) / 10,
          },
        };
      });
  });
}

/** Coletas de um ponto (só para membros dele ou para a plataforma). */
export function coletasDoPonto(pontoId, { status } = {}) {
  return chamarAutenticado((ator) => {
    const s = ler();
    if (!s.pontos.some((p) => p.id === Number(pontoId))) throw naoEncontrado('Ponto de coleta');
    exigir(
      ator,
      'coleta.listar_do_ponto',
      { ponto_id: Number(pontoId) },
      'Você só pode ver as coletas dos pontos em que trabalha.',
    );
    return s.coletas
      .filter((c) => c.ponto_id === Number(pontoId) && (!status || c.status === status))
      .map((c) => {
        const cidadao = s.usuarios.find((u) => u.id === c.usuario_id);
        // Sem usuario_id, telefone ou e-mail: o ponto não precisa disso.
        return {
          id: c.id,
          material: c.material,
          quantidade_kg: c.quantidade_kg,
          status: c.status,
          data_agendada: c.data_agendada,
          cidadao: nomeReduzido(cidadao?.nome),
        };
      })
      .sort((a, b) => (a.data_agendada < b.data_agendada ? -1 : 1));
  });
}
