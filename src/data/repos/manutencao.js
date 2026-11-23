// "Relógio" do sistema: prazos que vencem sozinhos (no Supabase seria um pg_cron).
//
//   • solicitação sem resposta até o prazo → EXPIRADA (cidadão é avisado);
//   • entrega confirmada sem check-in até o fim do dia → NÃO COMPARECEU;
//   • lembrete ao cidadão quando a janela está a menos de 24 h.
//
// Roda ao abrir o app e a cada minuto. Só grava quando há algo a mudar.

import { ler, transacao } from '../storage';
import { fimDoDia, dataHora } from '../../domain/agenda';
import { chamar } from './_rede';
import { registrarNotificacao } from './notificacoes';
import { mudarStatus, notificarEquipe, quando } from './_coleta';
import { situacaoDeFaltas, FALTAS_PARA_BLOQUEIO } from '../../domain/reputacao';

function pendencias(estado, agora) {
  const t = agora.getTime();
  return {
    expirar: estado.coletas.filter(
      (c) => c.status === 'solicitada' && c.responder_ate && Date.parse(c.responder_ate) <= t,
    ),
    faltou: estado.coletas.filter((c) => c.status === 'confirmada' && fimDoDia(c.data).getTime() < t),
    lembrar: estado.coletas.filter((c) => {
      if (c.status !== 'confirmada' || c.lembrete_enviado || !c.janela_inicio) return false;
      const ate = dataHora(c.data, c.janela_inicio).getTime() - t;
      return ate > 0 && ate <= 24 * 3600_000;
    }),
  };
}

/** Processa os prazos vencidos até `agora`. Devolve quantas coletas mudaram. */
export function processarPrazos({ agora = new Date() } = {}) {
  return chamar(() => {
    const p = pendencias(ler(), agora);
    const total = { expiradas: p.expirar.length, nao_compareceu: p.faltou.length, lembretes: p.lembrar.length };
    if (!total.expiradas && !total.nao_compareceu && !total.lembretes) return total;

    transacao((s) => {
      const em = agora.toISOString();
      const pegar = (c) => s.coletas.find((x) => x.id === c.id);
      for (const c0 of p.expirar) {
        const c = pegar(c0);
        mudarStatus(s, c, 'expirar', { ator: 'sistema', em });
        const ponto = s.pontos.find((x) => x.id === c.ponto_id);
        registrarNotificacao(s, c.usuario_id, {
          tipo: 'lembrete',
          icone: '⌛',
          texto: `${ponto.nome} não respondeu a tempo sua solicitação de ${quando(c)}. Que tal outro ponto?`,
        });
        notificarEquipe(s, c.ponto_id, {
          tipo: 'coleta',
          icone: '⌛',
          texto: `A solicitação ${c.codigo} expirou sem resposta.`,
        });
      }
      for (const c0 of p.faltou) {
        const c = pegar(c0);
        mudarStatus(s, c, 'marcar_nao_compareceu', { ator: 'sistema', em });
        c.codigo_entrega = null;
        registrarNotificacao(s, c.usuario_id, {
          tipo: 'lembrete',
          icone: '📭',
          texto: `Não registramos sua entrega de ${quando(c)}. Faltas seguidas reduzem sua reputação: cancele quando não puder ir.`,
        });
        // Reputação (Fase 4): avisa na 2ª falta; na 3ª em 30 dias, bloqueia por 7 dias.
        const { faltas, bloqueado_ate } = situacaoDeFaltas(
          s.coletas.filter((x) => x.usuario_id === c.usuario_id),
          agora,
        );
        if (bloqueado_ate) {
          registrarNotificacao(s, c.usuario_id, {
            tipo: 'lembrete',
            icone: '⛔',
            texto: `Você faltou a ${faltas} entregas em 30 dias. Novos agendamentos ficam bloqueados até ${new Date(bloqueado_ate).toLocaleDateString('pt-BR')}.`,
          });
        } else if (faltas === FALTAS_PARA_BLOQUEIO - 1) {
          registrarNotificacao(s, c.usuario_id, {
            tipo: 'lembrete',
            icone: '⚠️',
            texto: `Atenção: ${faltas} faltas em 30 dias. Mais uma bloqueia novos agendamentos por 7 dias.`,
          });
        }
      }
      for (const c0 of p.lembrar) {
        const c = pegar(c0);
        c.lembrete_enviado = true;
        const ponto = s.pontos.find((x) => x.id === c.ponto_id);
        registrarNotificacao(s, c.usuario_id, {
          tipo: 'lembrete',
          icone: '⏰',
          texto: `Lembrete: sua entrega no ${ponto.nome} é ${quando(c)}. Leve o código de entrega.`,
        });
      }
    });
    return total;
  });
}
