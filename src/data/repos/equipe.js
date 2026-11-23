// EQUIPE do ponto: convites por e-mail (código de uso único, guardado só como
// hash, válido por 7 dias e preso ao e-mail), papéis e revogação de acesso.

import { ler, transacao } from '../storage';
import { ErroApi, naoEncontrado, invalido } from '../erros';
import {
  PAPEIS_EQUIPE,
  VALIDADE_CONVITE_DIAS,
  MAX_CONVITES_PENDENTES,
  problemasDoConvite,
  normalizarEmail,
  situacaoDoConvite,
  podeRemoverOuRebaixar,
} from '../../domain/equipe';
import { novoCodigoPessoal } from '../../domain/codigos';
import { sha256 } from '../../domain/senhas';
import { chamarAutenticado, agoraISO, proximoId } from './_rede';
import { exigir, auditar } from './_sessao';
import { registrarNotificacao } from './notificacoes';

const DIA = 24 * 3600_000;
const PAPEL_DE_PARCEIRO = { gestor: 'parceiro_gestor', operador: 'parceiro_operador' };

function mascararEmail(email) {
  const [u, d] = String(email).split('@');
  return `${u.slice(0, 2)}${'•'.repeat(Math.max(1, u.length - 2))}@${d}`;
}

function emailDemo(s, para, assunto, corpo) {
  s.emails_demo.push({ id: proximoId(s, 'email'), para, assunto, corpo, em: agoraISO() });
}

/** Garante que a pessoa tem o papel de parceiro correspondente (para ver o perfil Parceiro). */
function garantirPapel(usuario, papelNoPonto) {
  const papel = PAPEL_DE_PARCEIRO[papelNoPonto];
  if (!usuario.papeis.includes(papel)) usuario.papeis = [...usuario.papeis, papel];
}

/** Equipe de um ponto (e, para a gestão, os convites). */
export function doPonto(pontoId) {
  return chamarAutenticado((ator) => {
    exigir(ator, 'equipe.ver', { ponto_id: Number(pontoId) }, 'Só a equipe do ponto vê a equipe.');
    const s = ler();
    const gestor = (ator.gestor_de || []).includes(Number(pontoId));
    const membros = s.membros
      .filter((m) => m.ponto_id === Number(pontoId) && m.ativo)
      .map((m) => {
        const u = s.usuarios.find((x) => x.id === m.usuario_id);
        return {
          id: m.id,
          nome: u?.nome || '—',
          papel: m.papel,
          papel_rotulo: PAPEIS_EQUIPE[m.papel]?.rotulo || m.papel,
          desde: m.desde || m.criado_em || null,
          pesagens: s.coletas.filter((c) => c.ponto_id === m.ponto_id && c.operador_pesagem_id === m.usuario_id).length,
          eu: m.usuario_id === ator.id,
        };
      })
      .sort((a, b) => (a.papel === b.papel ? a.nome.localeCompare(b.nome) : a.papel === 'gestor' ? -1 : 1));
    const convites = gestor
      ? s.convites
          .filter((c) => c.ponto_id === Number(pontoId))
          .map((c) => ({
            id: c.id,
            email: mascararEmail(c.email),
            papel_rotulo: PAPEIS_EQUIPE[c.papel].rotulo,
            expira_em: c.expira_em,
            situacao: situacaoDoConvite(c),
            criado_em: c.criado_em,
          }))
          .sort((a, b) => (a.criado_em < b.criado_em ? 1 : -1))
      : [];
    return { membros, convites, pode_gerenciar: gestor };
  });
}

/** Convida alguém por e-mail. O código vai SÓ para o e-mail (aqui, a caixa de e-mail da demo). */
export function convidar(pontoId, { email, papel = 'operador' }) {
  return chamarAutenticado(async (ator) => {
    exigir(ator, 'equipe.gerenciar', { ponto_id: Number(pontoId) }, 'Só a gestão do ponto convida pessoas.');
    const problemas = problemasDoConvite({ email, papel });
    if (problemas.length) throw invalido(problemas[0]);
    const codigo = novoCodigoPessoal();
    const codigo_hash = await sha256(codigo);
    return transacao((s) => {
      const ponto = s.pontos.find((p) => p.id === Number(pontoId));
      if (!ponto) throw naoEncontrado('Ponto de coleta');
      const alvo = normalizarEmail(email);
      const usuario = s.usuarios.find((u) => normalizarEmail(u.email) === alvo);
      if (usuario && s.membros.some((m) => m.ponto_id === ponto.id && m.usuario_id === usuario.id && m.ativo))
        throw new ErroApi(409, 'Esta pessoa já faz parte da equipe.');
      const pendentes = s.convites.filter((c) => c.ponto_id === ponto.id && situacaoDoConvite(c) === 'pendente');
      if (pendentes.length >= MAX_CONVITES_PENDENTES)
        throw new ErroApi(429, 'Muitos convites pendentes. Cancele algum antes.');
      // Um convite pendente por e-mail: o novo substitui o anterior.
      for (const c of pendentes.filter((x) => x.email === alvo)) c.cancelado_em = agoraISO();
      const c = {
        id: proximoId(s, 'convite'),
        ponto_id: ponto.id,
        email: alvo,
        papel,
        codigo_hash,
        criado_por: ator.id,
        criado_em: agoraISO(),
        expira_em: new Date(Date.now() + VALIDADE_CONVITE_DIAS * DIA).toISOString(),
        aceito_em: null,
        cancelado_em: null,
      };
      s.convites.push(c);
      const quem = s.usuarios.find((u) => u.id === ator.id)?.nome;
      emailDemo(
        s,
        alvo,
        `Convite para a equipe do ${ponto.nome}`,
        `${quem} convidou você para a equipe do ${ponto.nome} como ${PAPEIS_EQUIPE[papel].rotulo.toLowerCase()}.\n\n` +
          `Código do convite: ${codigo}\nVálido por ${VALIDADE_CONVITE_DIAS} dias, só para este e-mail.\n\n` +
          `Entre no ECOLINK com este e-mail (ou crie a conta) e abra: /convite?codigo=${codigo}`,
      );
      auditar(s, {
        ator_id: ator.id,
        acao: 'equipe.convite_enviado',
        recurso_tipo: 'ponto',
        recurso_id: ponto.id,
        detalhes: { papel },
      });
      return { id: c.id, expira_em: c.expira_em, email: mascararEmail(alvo) };
    });
  });
}

export function cancelarConvite(conviteId) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      const c = s.convites.find((x) => x.id === Number(conviteId));
      if (!c) throw naoEncontrado('Convite');
      exigir(ator, 'equipe.gerenciar', { ponto_id: c.ponto_id }, 'Só a gestão do ponto cancela convites.');
      if (situacaoDoConvite(c) !== 'pendente') throw new ErroApi(409, 'Este convite não está mais pendente.');
      c.cancelado_em = agoraISO();
      auditar(s, { ator_id: ator.id, acao: 'equipe.convite_cancelado', recurso_tipo: 'ponto', recurso_id: c.ponto_id });
      return { ok: true };
    }),
  );
}

/** Quem recebeu o convite aceita com o código (logado com o MESMO e-mail convidado). */
export function aceitarConvite(codigo) {
  return chamarAutenticado(async (ator) => {
    const limpo = String(codigo ?? '')
      .trim()
      .toUpperCase();
    if (!/^[A-Z2-9]{8}$/.test(limpo)) throw invalido('Código de convite inválido (8 letras e números).');
    const hash = await sha256(limpo);
    return transacao((s) => {
      const c = s.convites.find((x) => x.codigo_hash === hash);
      if (!c) throw naoEncontrado('Convite');
      const situacao = situacaoDoConvite(c);
      if (situacao !== 'pendente')
        throw new ErroApi(
          409,
          situacao === 'expirado'
            ? 'Este convite expirou. Peça um novo à gestão do ponto.'
            : 'Este convite não vale mais.',
        );
      const usuario = s.usuarios.find((u) => u.id === ator.id);
      if (normalizarEmail(usuario.email) !== c.email)
        throw new ErroApi(403, 'Este convite foi enviado para outro e-mail. Entre com a conta do e-mail convidado.', {
          acao: 'equipe.aceitar',
        });
      const ponto = s.pontos.find((p) => p.id === c.ponto_id);
      const existente = s.membros.find((m) => m.ponto_id === c.ponto_id && m.usuario_id === usuario.id);
      if (existente) Object.assign(existente, { ativo: true, papel: c.papel, desde: agoraISO(), removido_em: null });
      else
        s.membros.push({
          id: proximoId(s, 'membro'),
          ponto_id: c.ponto_id,
          usuario_id: usuario.id,
          papel: c.papel,
          ativo: true,
          desde: agoraISO(),
        });
      garantirPapel(usuario, c.papel);
      c.aceito_em = agoraISO();
      for (const m of s.membros.filter((x) => x.ponto_id === c.ponto_id && x.ativo && x.papel === 'gestor'))
        registrarNotificacao(s, m.usuario_id, {
          tipo: 'aprovacao',
          icone: '👋',
          texto: `${usuario.nome} entrou na equipe do ${ponto.nome} como ${PAPEIS_EQUIPE[c.papel].rotulo.toLowerCase()}.`,
        });
      auditar(s, {
        ator_id: ator.id,
        acao: 'equipe.convite_aceito',
        recurso_tipo: 'ponto',
        recurso_id: c.ponto_id,
        detalhes: { papel: c.papel },
      });
      return {
        ponto_id: ponto.id,
        ponto_nome: ponto.nome,
        papel: c.papel,
        papel_rotulo: PAPEIS_EQUIPE[c.papel].rotulo,
      };
    });
  });
}

/** Muda o papel de alguém da equipe (o ponto nunca fica sem gestor). */
export function alterarPapel(membroId, papel) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      const m = s.membros.find((x) => x.id === Number(membroId) && x.ativo);
      if (!m) throw naoEncontrado('Membro da equipe');
      exigir(ator, 'equipe.gerenciar', { ponto_id: m.ponto_id }, 'Só a gestão do ponto muda papéis.');
      if (!PAPEIS_EQUIPE[papel]) throw invalido('Papel inválido.');
      if (!podeRemoverOuRebaixar(s.membros, m, papel))
        throw new ErroApi(409, 'O ponto precisa de pelo menos um gestor.');
      m.papel = papel;
      garantirPapel(
        s.usuarios.find((u) => u.id === m.usuario_id),
        papel,
      );
      registrarNotificacao(s, m.usuario_id, {
        tipo: 'aprovacao',
        icone: '🔁',
        texto: `Seu papel no ${s.pontos.find((p) => p.id === m.ponto_id)?.nome} agora é ${PAPEIS_EQUIPE[papel].rotulo.toLowerCase()}.`,
      });
      auditar(s, {
        ator_id: ator.id,
        acao: 'equipe.papel_alterado',
        recurso_tipo: 'ponto',
        recurso_id: m.ponto_id,
        detalhes: { papel },
      });
      return { ok: true };
    }),
  );
}

/** Revoga o acesso (efeito imediato: a próxima chamada da pessoa já não vê o ponto). */
export function remover(membroId) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      const m = s.membros.find((x) => x.id === Number(membroId) && x.ativo);
      if (!m) throw naoEncontrado('Membro da equipe');
      exigir(ator, 'equipe.gerenciar', { ponto_id: m.ponto_id }, 'Só a gestão do ponto remove pessoas.');
      if (!podeRemoverOuRebaixar(s.membros, m)) throw new ErroApi(409, 'O ponto precisa de pelo menos um gestor.');
      m.ativo = false;
      m.removido_em = agoraISO();
      const ponto = s.pontos.find((p) => p.id === m.ponto_id);
      registrarNotificacao(s, m.usuario_id, {
        tipo: 'aprovacao',
        icone: '🚪',
        texto: `Seu acesso à equipe do ${ponto?.nome} foi encerrado pela gestão do ponto.`,
      });
      auditar(s, { ator_id: ator.id, acao: 'equipe.membro_removido', recurso_tipo: 'ponto', recurso_id: m.ponto_id });
      return { ok: true };
    }),
  );
}
