// Cadastro da ORGANIZAÇÃO parceira (ROADMAP §4.1).
//
// Fluxo: iniciar → preencher por etapas (salva rascunho a cada passo, "continue
// de onde parou") → anexar documentos → enviar para análise → a plataforma
// aprova ou pede ajustes (com motivo) → aprovada pode cadastrar pontos.

import { ler, transacao } from '../storage';
import { ErroApi, invalido, naoEncontrado } from '../erros';
import { lerBlob, removerBlob } from '../arquivos';
import { limparCNPJ, limparCPF } from '../../domain/documentos';
import {
  TIPOS_ORGANIZACAO,
  documentosExigidos,
  problemasDaOrganizacao,
  organizacaoCompleta,
} from '../../domain/organizacoes';
import { chamarAutenticado, agoraISO, proximoId } from './_rede';
import { exigir, auditar } from './_sessao';
import { registrarNotificacao } from './notificacoes';

const EDITAVEL = ['rascunho', 'reprovada'];
const MAX_DOCUMENTOS = 6;

/** Versão para a interface: com os problemas por etapa e os documentos exigidos. */
function paraTela(o) {
  return {
    ...o,
    problemas: problemasDaOrganizacao(o),
    completa: organizacaoCompleta(o),
    exigidos: TIPOS_ORGANIZACAO[o.tipo] ? documentosExigidos(o.tipo) : {},
    editavel: EDITAVEL.includes(o.status),
  };
}

const daPessoa = (estado, usuarioId) => estado.organizacoes.find((o) => o.responsavel_id === usuarioId) || null;

function buscarMinha(estado, ator) {
  const o = daPessoa(estado, ator.id);
  if (!o) throw naoEncontrado('Cadastro de parceiro');
  exigir(ator, 'organizacao.gerenciar', o, 'Entre no perfil Parceiro para gerenciar o cadastro.');
  return o;
}

/** O cadastro da organização da pessoa logada (ou null se ainda não começou). */
export function minha() {
  return chamarAutenticado((ator) => {
    const o = daPessoa(ler(), ator.id);
    return o ? paraTela(o) : null;
  });
}

/**
 * Começa o cadastro de parceiro: dá à pessoa o papel de gestor (se ainda não
 * tiver), muda a sessão para o perfil Parceiro e cria o rascunho da organização.
 * Chamar de novo devolve o cadastro já existente (não duplica).
 */
export function iniciar() {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      const existente = daPessoa(s, ator.id);
      const u = s.usuarios.find((x) => x.id === ator.id);
      if (!u.papeis.includes('parceiro_gestor')) u.papeis = ['parceiro_gestor', ...u.papeis];
      const sessao = s.sessoes.find((x) => x.id === ator.sessao_id);
      sessao.perfil = 'parceiro';
      u.ultimo_perfil = 'parceiro';
      if (existente) return paraTela(existente);

      const nova = {
        id: proximoId(s, 'organizacao'),
        tipo: '',
        nome: '',
        razao_social: '',
        documento: '',
        responsavel_id: u.id,
        responsavel_cargo: '',
        telefone: u.telefone || '',
        sobre: '',
        documentos: [],
        status: 'rascunho',
        motivo: null,
        criado_em: agoraISO(),
        enviado_em: null,
        analisado_em: null,
        analisado_por: null,
      };
      s.organizacoes.push(nova);
      auditar(s, { ator_id: u.id, acao: 'organizacao.iniciada', recurso_tipo: 'organizacao', recurso_id: nova.id });
      return paraTela(nova);
    }),
  );
}

/** Salva uma etapa (rascunho). Aceita dados incompletos; o envio é que exige tudo. */
export function salvar(dados) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      const o = buscarMinha(s, ator);
      if (!EDITAVEL.includes(o.status))
        throw new ErroApi(
          409,
          o.status === 'em_analise'
            ? 'O cadastro está em análise: aguarde a resposta para editar.'
            : 'Cadastro já aprovado.',
        );

      const corta = (v, max) =>
        String(v ?? '')
          .trim()
          .slice(0, max);
      if ('tipo' in dados) {
        if (dados.tipo && !TIPOS_ORGANIZACAO[dados.tipo]) throw invalido('Tipo de organização inválido.', 'tipo');
        o.tipo = dados.tipo;
      }
      if ('nome' in dados) o.nome = corta(dados.nome, 80);
      if ('razao_social' in dados) o.razao_social = corta(dados.razao_social, 120);
      if ('documento' in dados) {
        o.documento =
          TIPOS_ORGANIZACAO[o.tipo]?.documento === 'cpf'
            ? limparCPF(dados.documento).slice(0, 11)
            : limparCNPJ(dados.documento).slice(0, 14);
      }
      if ('responsavel_cargo' in dados) o.responsavel_cargo = corta(dados.responsavel_cargo, 60);
      if ('telefone' in dados) o.telefone = corta(dados.telefone, 20);
      if ('sobre' in dados) o.sobre = corta(dados.sobre, 500);
      return paraTela(o);
    }),
  );
}

/** Anexa um documento já enviado (arquivos.enviar). Substitui o anterior do mesmo tipo. */
export function adicionarDocumento({ tipo, ref, nome, mime, tamanho }) {
  return chamarAutenticado(async (ator) => {
    let substituido = null;
    const resultado = transacao((s) => {
      const o = buscarMinha(s, ator);
      if (!EDITAVEL.includes(o.status)) throw new ErroApi(409, 'Não é possível alterar documentos agora.');
      const aceitos = [...Object.keys(documentosExigidos(o.tipo)), 'outro'];
      if (!aceitos.includes(tipo)) throw invalido('Tipo de documento inválido.', 'tipo');
      if (!String(ref).startsWith('arq_')) throw invalido('Arquivo inválido.');
      substituido = o.documentos.find((d) => d.tipo === tipo && tipo !== 'outro')?.ref ?? null;
      o.documentos = o.documentos.filter((d) => d.tipo !== tipo || tipo === 'outro');
      if (o.documentos.length >= MAX_DOCUMENTOS) throw invalido(`No máximo ${MAX_DOCUMENTOS} documentos.`);
      o.documentos.push({
        id: (Math.max(0, ...o.documentos.map((d) => d.id)) || 0) + 1,
        tipo,
        ref,
        nome,
        mime,
        tamanho,
        enviado_em: agoraISO(),
      });
      auditar(s, {
        ator_id: ator.id,
        acao: 'organizacao.documento_anexado',
        recurso_tipo: 'organizacao',
        recurso_id: o.id,
        detalhes: { tipo },
      });
      return paraTela(o);
    });
    if (substituido) await removerBlob(substituido);
    return resultado;
  });
}

export function removerDocumento(documentoId) {
  return chamarAutenticado(async (ator) => {
    let ref = null;
    const resultado = transacao((s) => {
      const o = buscarMinha(s, ator);
      if (!EDITAVEL.includes(o.status)) throw new ErroApi(409, 'Não é possível alterar documentos agora.');
      const doc = o.documentos.find((d) => d.id === Number(documentoId));
      if (!doc) throw naoEncontrado('Documento');
      ref = doc.ref;
      o.documentos = o.documentos.filter((d) => d.id !== doc.id);
      return paraTela(o);
    });
    await removerBlob(ref);
    return resultado;
  });
}

/** Abre um documento (só o responsável e a plataforma). Devolve o arquivo (Blob). */
export function verDocumento(organizacaoId, documentoId) {
  return chamarAutenticado(async (ator) => {
    const o = ler().organizacoes.find((x) => x.id === Number(organizacaoId));
    if (!o) throw naoEncontrado('Organização');
    exigir(ator, 'organizacao.ver_documentos', o, 'Documentos de parceiros são privados.');
    const doc = o.documentos.find((d) => d.id === Number(documentoId));
    if (!doc) throw naoEncontrado('Documento');
    const blob = await lerBlob(doc.ref);
    if (!blob) throw naoEncontrado('Arquivo');
    return { blob, nome: doc.nome };
  });
}

/** Envia para análise da plataforma (exige o cadastro completo). */
export function enviarParaAnalise() {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      const o = buscarMinha(s, ator);
      if (!EDITAVEL.includes(o.status)) throw new ErroApi(409, 'Este cadastro já foi enviado.');
      const problemas = Object.values(problemasDaOrganizacao(o)).flat();
      if (problemas.length) throw invalido(problemas[0]);
      o.status = 'em_analise';
      o.enviado_em = agoraISO();
      auditar(s, { ator_id: ator.id, acao: 'organizacao.enviada', recurso_tipo: 'organizacao', recurso_id: o.id });
      for (const admin of s.usuarios.filter((u) => u.papeis.includes('admin') && u.status === 'ativo')) {
        registrarNotificacao(s, admin.id, {
          tipo: 'aprovacao',
          icone: '🏢',
          texto: `Novo parceiro para análise: ${o.nome}.`,
        });
      }
      return paraTela(o);
    }),
  );
}
