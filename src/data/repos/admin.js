// Área da plataforma (administração e moderação).

import { ler, transacao } from '../storage';
import { ErroApi, naoEncontrado, invalido } from '../erros';
import { PAPEIS } from '../../domain/permissoes';
import { chamarAutenticado, agoraISO, proximoId } from './_rede';
import { exigir, auditar } from './_sessao';
import { publico } from './usuarios';
import { registrarNotificacao } from './notificacoes';
import { resumoParaPonto } from './_reputacao';
import { projetarPonto } from './pontos';
import { TIPOS_ORGANIZACAO } from '../../domain/organizacoes';
import { problemasDoPonto } from '../../domain/pontos';
import { validarCNPJ, validarCPF } from '../../domain/documentos';

/** Lista de usuários com papéis e situação. Busca por nome ou e-mail. */
export function listarUsuarios({ busca = '' } = {}) {
  return chamarAutenticado((ator) => {
    exigir(ator, 'usuario.listar');
    const termo = busca.trim().toLowerCase();
    const s = ler();
    return s.usuarios
      .filter((u) => !termo || u.nome.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo))
      .map((u) => ({
        ...publico(u),
        papeis_rotulos: u.papeis.map((p) => PAPEIS[p]?.rotulo || p),
        sessoes_ativas: s.sessoes.filter(
          (x) => x.usuario_id === u.id && !x.revogada_em && Date.parse(x.expira_em) > Date.now(),
        ).length,
        reputacao: u.papeis.includes('cidadao') ? resumoParaPonto(s, u.id) : null,
      }));
  });
}

/**
 * Suspende ou reativa uma conta (só administração; nunca a própria).
 * Suspender encerra todas as sessões da pessoa na hora.
 */
export function alterarStatus(usuarioId, status, motivo = '') {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      const u = s.usuarios.find((x) => x.id === Number(usuarioId));
      if (!u) throw naoEncontrado('Usuário');
      exigir(ator, 'usuario.alterar_status', u, 'Só a administração pode suspender contas (e nunca a própria).');
      if (!['ativo', 'suspenso'].includes(status)) throw invalido('Situação inválida.');
      if (status === 'suspenso' && !String(motivo).trim()) throw invalido('Informe o motivo da suspensão.', 'motivo');
      if (u.status === status) throw new ErroApi(409, `A conta já está ${status === 'ativo' ? 'ativa' : 'suspensa'}.`);
      u.status = status;
      if (status === 'suspenso')
        for (const x of s.sessoes) if (x.usuario_id === u.id && !x.revogada_em) x.revogada_em = agoraISO();
      auditar(s, {
        ator_id: ator.id,
        acao: status === 'suspenso' ? 'usuario.suspenso' : 'usuario.reativado',
        recurso_tipo: 'usuario',
        recurso_id: u.id,
        detalhes: motivo ? { motivo: String(motivo).trim().slice(0, 200) } : null,
      });
      return publico(u);
    }),
  );
}

/** Log de auditoria, do mais recente para o mais antigo. */
export function auditoria({ acao = '', limite = 200 } = {}) {
  return chamarAutenticado((ator) => {
    exigir(ator, 'auditoria.ver');
    const s = ler();
    const nomes = new Map(s.usuarios.map((u) => [u.id, u.nome]));
    return s.auditoria
      .filter((r) => !acao || r.acao.startsWith(acao))
      .slice(-limite)
      .reverse()
      .map((r) => ({ ...r, ator_nome: r.ator_id ? nomes.get(r.ator_id) || `#${r.ator_id}` : 'Anônimo' }));
  });
}

/* ------------------------------ aprovações (Fase 2) ------------------------------ */

function emailDemo(estado, para, assunto, corpo) {
  estado.emails_demo.push({ id: proximoId(estado, 'email'), para, assunto, corpo, em: agoraISO() });
}

/** Fila de análise: organizações e pontos enviados, do mais antigo para o mais novo. */
export function filaAprovacoes() {
  return chamarAutenticado((ator) => {
    exigir(ator, 'aprovacao.ver');
    const s = ler();
    const porEnvio = (a, b) => (a.enviado_em < b.enviado_em ? -1 : 1);
    const organizacoes = s.organizacoes
      .filter((o) => o.status === 'em_analise')
      .sort(porEnvio)
      .map((o) => {
        const resp = s.usuarios.find((u) => u.id === o.responsavel_id);
        const tipo = TIPOS_ORGANIZACAO[o.tipo];
        return {
          ...o,
          tipo_rotulo: tipo?.rotulo,
          documento_tipo: tipo?.documento,
          documento_valido: tipo?.documento === 'cpf' ? validarCPF(o.documento) : validarCNPJ(o.documento),
          responsavel: resp ? { nome: resp.nome, email: resp.email, criado_em: resp.criado_em } : null,
        };
      });
    const pontos = s.pontos
      .filter((p) => p.status === 'em_analise')
      .sort(porEnvio)
      .map((p) => ({
        ...projetarPonto(s, p),
        enviado_em: p.enviado_em,
        regras: p.regras,
        problemas: Object.values(problemasDoPonto(p)).flat(),
      }));
    return { organizacoes, pontos };
  });
}

/** Aprova ou pede ajustes num cadastro de organização. Reprovar exige motivo. */
export function decidirOrganizacao(id, { aprovar, motivo = '' }) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      exigir(ator, 'aprovacao.decidir', {}, 'Só a administração aprova parceiros.');
      const o = s.organizacoes.find((x) => x.id === Number(id));
      if (!o) throw naoEncontrado('Organização');
      if (o.status !== 'em_analise') throw new ErroApi(409, 'Este cadastro não está aguardando análise.');
      const texto = String(motivo).trim().slice(0, 300);
      if (!aprovar && texto.length < 10)
        throw invalido('Explique o que precisa ser ajustado (mínimo 10 caracteres).', 'motivo');
      o.status = aprovar ? 'aprovada' : 'reprovada';
      o.motivo = aprovar ? null : texto;
      o.analisado_em = agoraISO();
      o.analisado_por = ator.id;
      auditar(s, {
        ator_id: ator.id,
        acao: aprovar ? 'organizacao.aprovada' : 'organizacao.reprovada',
        recurso_tipo: 'organizacao',
        recurso_id: o.id,
        detalhes: aprovar ? null : { motivo: texto },
      });
      const resp = s.usuarios.find((u) => u.id === o.responsavel_id);
      registrarNotificacao(s, o.responsavel_id, {
        tipo: 'aprovacao',
        icone: aprovar ? '✅' : '✏️',
        texto: aprovar
          ? `${o.nome} foi aprovada! Agora você pode cadastrar seus pontos de coleta.`
          : `Seu cadastro precisa de ajustes: ${texto}`,
      });
      if (resp)
        emailDemo(
          s,
          resp.email,
          aprovar ? 'Cadastro de parceiro aprovado' : 'Seu cadastro de parceiro precisa de ajustes',
          aprovar
            ? `A organização ${o.nome} foi aprovada no ECOLINK. Entre no app para cadastrar seus pontos.`
            : `Revise o cadastro de ${o.nome}: ${texto}`,
        );
      return { id: o.id, status: o.status };
    }),
  );
}

/** Aprova (fica visível no mapa, recebendo) ou reprova um ponto. Reprovar exige motivo. */
export function decidirPonto(id, { aprovar, motivo = '' }) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      exigir(ator, 'aprovacao.decidir', {}, 'Só a administração aprova pontos.');
      const p = s.pontos.find((x) => x.id === Number(id));
      if (!p) throw naoEncontrado('Ponto de coleta');
      if (p.status !== 'em_analise') throw new ErroApi(409, 'Este ponto não está aguardando análise.');
      const texto = String(motivo).trim().slice(0, 300);
      if (!aprovar && texto.length < 10)
        throw invalido('Explique o que precisa ser ajustado (mínimo 10 caracteres).', 'motivo');
      p.status = aprovar ? 'ativo' : 'reprovado';
      p.motivo_status = aprovar ? null : texto;
      if (aprovar) p.aprovado_em = agoraISO();
      auditar(s, {
        ator_id: ator.id,
        acao: aprovar ? 'ponto.aprovado' : 'ponto.reprovado',
        recurso_tipo: 'ponto',
        recurso_id: p.id,
        detalhes: aprovar ? null : { motivo: texto },
      });
      const gestores = s.membros.filter((m) => m.ponto_id === p.id && m.papel === 'gestor').map((m) => m.usuario_id);
      for (const uid of gestores) {
        registrarNotificacao(s, uid, {
          tipo: 'aprovacao',
          icone: aprovar ? '📍' : '✏️',
          texto: aprovar ? `${p.nome} foi aprovado e já aparece no mapa!` : `${p.nome} precisa de ajustes: ${texto}`,
        });
      }
      return { id: p.id, status: p.status };
    }),
  );
}
