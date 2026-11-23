// Pontos de coleta — leitura PÚBLICA (não exige login), como o mapa de um app
// de delivery. Só aparecem pontos APROVADOS (recebendo ou pausados): rascunhos,
// pontos em análise, reprovados ou suspensos nunca chegam ao cidadão.
// As listagens já vêm com o resumo das avaliações e a organização responsável.

import { ler } from '../storage';
import { naoEncontrado } from '../erros';
import { filtrarPontos, resumoAvaliacoes, visivelAoPublico, recebendo } from '../../domain/pontos';
import { resumoHorario } from '../../domain/horarios';
import { TIPOS_ORGANIZACAO } from '../../domain/organizacoes';
import { chamar } from './_rede';
import { reputacaoDoPonto } from './_reputacao';
import { materiaisLotados } from './_estoque';

/** O que o público vê de um ponto (sem campos internos de análise). */
export function projetarPonto(estado, p) {
  const org = estado.organizacoes.find((o) => o.id === p.organizacao_id);
  return {
    id: p.id,
    nome: p.nome,
    descricao: p.descricao,
    endereco: p.endereco,
    cidade: p.cidade,
    latitude: p.latitude,
    longitude: p.longitude,
    instrucoes_acesso: p.instrucoes_acesso,
    materiais: p.materiais,
    regras_materiais: p.regras_materiais,
    horarios: p.horarios,
    excecoes: p.excecoes,
    horario: resumoHorario(p.horarios),
    fotos: p.fotos,
    status: p.status,
    ativo: recebendo(p),
    materiais_lotados: materiaisLotados(estado, p),
    organizacao: org
      ? { nome: org.nome, tipo: TIPOS_ORGANIZACAO[org.tipo]?.rotulo, verificada: org.status === 'aprovada' }
      : null,
    avaliacao: resumoAvaliacoes(estado.avaliacoes.filter((a) => a.ponto_id === p.id && a.verificada && !a.removida)),
    reputacao: (({ score, selos, nota, total_avaliacoes, tempo_resposta_horas }) => ({
      score,
      selos,
      nota,
      total_avaliacoes,
      tempo_resposta_horas,
    }))(reputacaoDoPonto(estado, p.id)),
  };
}

/** Lista pontos públicos, opcionalmente filtrados por { cidade, material, ativo }. */
export function listar(filtros = {}) {
  return chamar(() => {
    const s = ler();
    const publicos = s.pontos.filter(visivelAoPublico).map((p) => projetarPonto(s, p));
    return filtrarPontos(publicos, filtros);
  });
}

/** Um ponto público, com total de coletas registradas. Não aprovado → 404. */
export function obter(id) {
  return chamar(() => {
    const s = ler();
    const p = s.pontos.find((x) => x.id === Number(id));
    if (!p || !visivelAoPublico(p)) throw naoEncontrado('Ponto de coleta');
    return { ...projetarPonto(s, p), total_coletas: s.coletas.filter((c) => c.ponto_id === p.id).length };
  });
}
