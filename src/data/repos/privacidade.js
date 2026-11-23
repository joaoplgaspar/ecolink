// DIREITOS DO TITULAR (LGPD): exportar os próprios dados (JSON) e excluir a conta.
// A exclusão pede a SENHA de novo (reautenticação) e a palavra EXCLUIR.

import { ler, transacao } from '../storage';
import { ErroApi, invalido } from '../erros';
import {
  impedimentosDeExclusao,
  EFEITOS_EXCLUSAO,
  CONFIRMACAO_EXCLUSAO,
  NOME_ANONIMO,
  semSegredos,
} from '../../domain/privacidade';
import { verificarHash } from '../../domain/senhas';
import { STATUS_COLETA } from '../../domain/coletaMaquina';
import { getMaterial } from '../../domain/materiais';
import { nomeReduzido } from '../../utils/format';
import { chamarAutenticado, agoraISO, proximoId } from './_rede';
import { exigir, auditar } from './_sessao';
import { mudarStatus, notificarEquipe, quando } from './_coleta';
import { restricaoDaConta } from './_moderacao';

const nomePonto = (s, id) => s.pontos.find((p) => p.id === id)?.nome || '—';

/** Tudo o que a plataforma guarda sobre a pessoa, num JSON legível (sem segredos). */
export function exportar() {
  return chamarAutenticado((ator) => {
    exigir(ator, 'conta.gerenciar_propria');
    const s = ler();
    const u = s.usuarios.find((x) => x.id === ator.id);
    const minhasColetas = s.coletas.filter((c) => c.usuario_id === u.id);
    const idsColetas = new Set(minhasColetas.map((c) => c.id));
    const conversas = s.conversas.filter((c) => c.usuario_id === u.id);
    const dados = {
      sobre: {
        gerado_em: agoraISO(),
        plataforma: 'ECOLINK',
        base_legal: 'Art. 18 da LGPD (Lei 13.709/2018): direito de acesso e portabilidade.',
        observacao:
          'Dados de outras pessoas aparecem só com nome reduzido. Senhas, tokens e códigos não são exportados.',
      },
      titular: {
        nome: u.nome,
        email: u.email,
        telefone: u.telefone || null,
        cidade: u.cidade || null,
        papeis: u.papeis,
        criado_em: u.criado_em,
        aceite_termos: u.aceite_termos || null,
      },
      entregas: minhasColetas.map((c) => ({
        codigo: c.codigo,
        ponto: nomePonto(s, c.ponto_id),
        data: c.data,
        janela: c.janela_inicio ? `${c.janela_inicio}–${c.janela_fim}` : null,
        situacao: STATUS_COLETA[c.status]?.rotulo,
        itens: (c.itens || []).map((i) => ({
          material: getMaterial(i.material).label,
          kg_declarado: i.kg_declarado ?? null,
          kg_pesado: i.kg_aferido ?? null,
          situacao: i.status,
        })),
        linha_do_tempo: s.coleta_eventos
          .filter((e) => e.coleta_id === c.id)
          .map((e) => ({ acao: e.acao, para: e.para, por: e.ator, motivo: e.motivo, em: e.em })),
      })),
      extrato: s.extrato
        .filter((l) => l.usuario_id === u.id)
        .map(({ tipo, valor, descricao, em }) => ({ tipo, valor, descricao, em })),
      resgates: s.resgates
        .filter((r) => r.usuario_id === u.id)
        .map(({ nome, parceiro, custo, codigo, em }) => ({ nome, parceiro, custo, codigo, em })),
      avaliacoes_que_fiz: s.avaliacoes
        .filter((a) => a.usuario_id === u.id)
        .map((a) => ({
          ponto: nomePonto(s, a.ponto_id),
          nota: a.nota,
          tags: a.tags,
          comentario: a.comentario,
          em: a.em,
          resposta_do_ponto: a.resposta?.texto ?? null,
        })),
      avaliacoes_que_recebi: (s.avaliacoes_cidadao || [])
        .filter((a) => a.cidadao_id === u.id)
        .map((a) => ({
          ponto: nomePonto(s, a.ponto_id),
          nota: a.nota,
          tags: a.tags,
          comentario: a.comentario,
          em: a.em,
        })),
      conversas: conversas.map((c) => ({
        ponto: nomePonto(s, c.ponto_id),
        mensagens: s.mensagens
          .filter((m) => m.conversa_id === c.id)
          .map((m) => ({
            de: m.de === 'cidadao' ? 'você' : 'ponto',
            texto: m.removida ? '(removida pela moderação)' : m.texto,
            em: m.em,
          })),
      })),
      denuncias_que_fiz: s.denuncias
        .filter((d) => d.autor_id === u.id)
        .map((d) => ({
          protocolo: d.protocolo,
          sobre: d.alvo_rotulo,
          motivo: d.categoria_rotulo,
          relato: d.descricao,
          situacao: d.status,
          criada_em: d.criada_em,
        })),
      decisoes_sobre_mim: s.denuncias
        .filter((d) => d.denunciado_id === u.id && d.decidida_em)
        .map((d) => ({
          protocolo: d.protocolo,
          motivo: d.categoria_rotulo,
          situacao: d.status,
          decidida_em: d.decidida_em,
        })),
      equipes: s.membros
        .filter((m) => m.usuario_id === u.id)
        .map((m) => ({ ponto: nomePonto(s, m.ponto_id), papel: m.papel, ativo: m.ativo, desde: m.desde })),
      bloqueios: s.bloqueios.filter((b) => b.autor_id === u.id).map((b) => ({ tipo: b.alvo_tipo, em: b.em })),
      sessoes: s.sessoes
        .filter((x) => x.usuario_id === u.id)
        .map((x) => ({
          dispositivo: x.dispositivo,
          criada_em: x.criada_em,
          ultimo_uso: x.ultimo_uso,
          encerrada_em: x.revogada_em,
        })),
      notificacoes: s.notificacoes
        .filter((n) => n.usuario_id === u.id)
        .map(({ texto, em, lida }) => ({ texto, em, lida })),
      registro_de_acoes: s.auditoria.filter((a) => a.ator_id === u.id).map(({ acao, em }) => ({ acao, em })),
      equipes_que_pesaram_minhas_entregas: [
        ...new Set(
          minhasColetas
            .filter((c) => c.operador_pesagem_id)
            .map((c) => nomeReduzido(s.usuarios.find((x) => x.id === c.operador_pesagem_id)?.nome)),
        ),
      ],
      _contagem: { entregas: idsColetas.size, conversas: conversas.length },
    };
    transacao((st) =>
      auditar(st, { ator_id: u.id, acao: 'conta.dados_exportados', recurso_tipo: 'usuario', recurso_id: u.id }),
    );
    return semSegredos(dados);
  });
}

/** O que impede (e o que acontece com) a exclusão — mostrado ANTES de confirmar. */
export function verificarExclusao() {
  return chamarAutenticado((ator) => {
    exigir(ator, 'conta.gerenciar_propria');
    const s = ler();
    const usuario = s.usuarios.find((u) => u.id === ator.id);
    return {
      impedimentos: impedimentosDeExclusao({
        usuario,
        membros: s.membros.map((m) => ({ ...m, ponto_nome: nomePonto(s, m.ponto_id) })),
        organizacoes: s.organizacoes || [],
        coletas: s.coletas,
        restricao: restricaoDaConta(s, usuario.id),
      }),
      efeitos: EFEITOS_EXCLUSAO,
      confirmacao: CONFIRMACAO_EXCLUSAO,
    };
  });
}

/** Exclui (anonimiza) a conta. Pede a senha e a confirmação por escrito. */
export function excluirConta({ senha, confirmacao }) {
  return chamarAutenticado(async (ator) => {
    exigir(ator, 'conta.gerenciar_propria');
    if (
      String(confirmacao ?? '')
        .trim()
        .toUpperCase() !== CONFIRMACAO_EXCLUSAO
    )
      throw invalido(`Digite ${CONFIRMACAO_EXCLUSAO} para confirmar.`, 'confirmacao');
    const atual = ler().usuarios.find((u) => u.id === ator.id);
    if (!(await verificarHash(String(senha ?? ''), atual.senha_hash)))
      throw new ErroApi(401, 'Senha incorreta. Por segurança, confirme a senha para excluir a conta.', {
        campo: 'senha',
      });

    return transacao((s) => {
      const u = s.usuarios.find((x) => x.id === ator.id);
      const impedimentos = impedimentosDeExclusao({
        usuario: u,
        membros: s.membros.map((m) => ({ ...m, ponto_nome: nomePonto(s, m.ponto_id) })),
        organizacoes: s.organizacoes || [],
        coletas: s.coletas,
        restricao: restricaoDaConta(s, u.id),
      });
      if (impedimentos.length) throw new ErroApi(409, impedimentos[0], { impedimentos });
      const em = agoraISO();
      const emailOriginal = u.email;

      // 1) Entregas que ainda não aconteceram: canceladas, com aviso ao ponto.
      for (const c of s.coletas.filter(
        (x) => x.usuario_id === u.id && ['solicitada', 'confirmada'].includes(x.status),
      )) {
        mudarStatus(s, c, 'cancelar', { ator: 'cidadao', ator_id: u.id, motivo: 'Conta excluída pela pessoa', em });
        c.cancelada_por = 'cidadao';
        c.codigo_entrega = null;
        notificarEquipe(s, c.ponto_id, {
          tipo: 'coleta',
          icone: '🚫',
          texto: `A entrega ${c.codigo} de ${quando(c)} foi cancelada (a conta foi excluída).`,
        });
      }
      // 2) Conteúdo pessoal: mensagens e comentários apagados; notas ficam sem nome.
      const conversas = new Set(s.conversas.filter((c) => c.usuario_id === u.id).map((c) => c.id));
      for (const m of s.mensagens.filter((x) => conversas.has(x.conversa_id) && x.de === 'cidadao')) {
        m.texto = 'Mensagem apagada (conta excluída).';
        m.alertas = [];
        m.apagada = true;
      }
      for (const a of s.avaliacoes.filter((x) => x.usuario_id === u.id))
        Object.assign(a, { usuario_nome: NOME_ANONIMO, comentario: '' });
      // 3) Vínculos e acessos.
      for (const m of s.membros.filter((x) => x.usuario_id === u.id && x.ativo))
        Object.assign(m, { ativo: false, removido_em: em });
      for (const x of s.sessoes.filter((y) => y.usuario_id === u.id && !y.revogada_em)) x.revogada_em = em;
      s.bloqueios = s.bloqueios.filter((b) => b.autor_id !== u.id);
      s.notificacoes = s.notificacoes.filter((n) => n.usuario_id !== u.id);
      s.recuperacoes = (s.recuperacoes || []).filter((r) => r.usuario_id !== u.id);
      for (const c of s.convites.filter((x) => x.email === emailOriginal && !x.aceito_em && !x.cancelado_em))
        c.cancelado_em = em;
      // 4) A conta: dados pessoais saem; o id continua (livro-caixa e histórico apontam para ele).
      Object.assign(u, {
        nome: NOME_ANONIMO,
        email: `excluida-${u.id}@anonimo.ecolink`,
        telefone: null,
        cidade: null,
        codigo_pessoal: null,
        senha_hash: null,
        status: 'excluido',
        excluido_em: em,
        papeis: [],
      });
      s.emails_demo.push({
        id: proximoId(s, 'email'),
        para: emailOriginal,
        assunto: 'Sua conta no ECOLINK foi excluída',
        corpo:
          'Confirmamos a exclusão da sua conta. Seus dados pessoais foram apagados. Se não foi você, responda a este e-mail.',
        em,
      });
      auditar(s, { ator_id: u.id, acao: 'conta.excluida', recurso_tipo: 'usuario', recurso_id: u.id });
      return { ok: true };
    });
  });
}
