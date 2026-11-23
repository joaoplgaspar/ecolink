// RELATÓRIOS do ponto: números para gráficos e exportação CSV (padrão brasileiro).

import { ler } from '../storage';
import { naoEncontrado } from '../erros';
import { relatorioDoPonto, paraCSV } from '../../domain/relatorios';
import { STATUS_COLETA } from '../../domain/coletaMaquina';
import { TIPOS_DESTINO, rastrear } from '../../domain/estoque';
import { getMaterial } from '../../domain/materiais';
import { nomeReduzido } from '../../utils/format';
import { chamarAutenticado } from './_rede';
import { exigir } from './_sessao';
import { estoqueDoPonto } from './_estoque';

function dadosDoPonto(s, pontoId) {
  const ponto = s.pontos.find((p) => p.id === Number(pontoId));
  if (!ponto) throw naoEncontrado('Ponto de coleta');
  const coletas = s.coletas.filter((c) => c.ponto_id === ponto.id);
  const ids = new Set(coletas.map((c) => c.id));
  return {
    ponto,
    coletas,
    destinacoes: (s.destinacoes || []).filter((d) => d.ponto_id === ponto.id),
    eventos: s.coleta_eventos.filter((e) => ids.has(e.coleta_id)),
  };
}

export function doPonto(pontoId, { meses = 6 } = {}) {
  return chamarAutenticado((ator) => {
    exigir(ator, 'relatorio.ver', { ponto_id: Number(pontoId) }, 'Só a equipe do ponto vê os relatórios.');
    const s = ler();
    const { ponto, coletas, destinacoes, eventos } = dadosDoPonto(s, pontoId);
    const r = relatorioDoPonto({ coletas, destinacoes, eventos, meses: Math.min(12, Math.max(1, Number(meses) || 6)) });
    return {
      ponto_nome: ponto.nome,
      ...r,
      materiais: r.materiais.map((m) => ({
        ...m,
        rotulo: getMaterial(m.material).label,
        cor: getMaterial(m.material).color,
      })),
    };
  });
}

const nomeDe = (s, id) => nomeReduzido(s.usuarios.find((u) => u.id === id)?.nome) || '';

/** CSV das entregas (uma linha por item). Cidadão só com nome reduzido (minimização). */
export function csvEntregas(pontoId) {
  return chamarAutenticado((ator) => {
    exigir(ator, 'relatorio.ver', { ponto_id: Number(pontoId) }, 'Só a equipe do ponto exporta relatórios.');
    const s = ler();
    const { coletas } = dadosDoPonto(s, pontoId);
    const linhas = [...coletas]
      .sort((a, b) => (a.data < b.data ? -1 : 1))
      .flatMap((c) =>
        (c.itens || []).map((i) => ({
          data: c.data,
          codigo: c.codigo,
          situacao: STATUS_COLETA[c.status]?.rotulo,
          cidadao: nomeDe(s, c.usuario_id),
          material: getMaterial(i.material).label,
          declarado: i.kg_declarado ?? null,
          pesado: i.kg_aferido ?? null,
          item: i.status === 'aprovado' ? 'Aprovado' : i.status === 'rejeitado' ? 'Recusado' : '',
          operador: c.operador_pesagem_id ? nomeDe(s, c.operador_pesagem_id) : '',
        })),
      );
    return paraCSV(linhas, [
      { chave: 'data', titulo: 'Data' },
      { chave: 'codigo', titulo: 'Entrega' },
      { chave: 'situacao', titulo: 'Situação' },
      { chave: 'cidadao', titulo: 'Cidadão' },
      { chave: 'material', titulo: 'Material' },
      { chave: 'declarado', titulo: 'Declarado (kg)' },
      { chave: 'pesado', titulo: 'Pesado (kg)' },
      { chave: 'item', titulo: 'Item' },
      { chave: 'operador', titulo: 'Pesado por' },
    ]);
  });
}

/** CSV das destinações, com de quantas entregas veio cada material (rastreabilidade). */
export function csvDestinacoes(pontoId) {
  return chamarAutenticado((ator) => {
    exigir(ator, 'relatorio.ver', { ponto_id: Number(pontoId) }, 'Só a equipe do ponto exporta relatórios.');
    const s = ler();
    const { ponto } = dadosDoPonto(s, pontoId);
    const { entradas, destinacoes } = estoqueDoPonto(s, ponto.id);
    const { saidas } = rastrear(entradas, destinacoes);
    const linhas = saidas.map((x) => {
      const d = destinacoes.find((y) => y.id === x.destinacao_id);
      return {
        data: d.data,
        destino: d.destino_nome,
        tipo: TIPOS_DESTINO[d.destino_tipo],
        cnpj: d.documento || '',
        material: getMaterial(x.material).label,
        kg: x.kg,
        entregas: new Set(x.origens.map((o) => o.coleta_id)).size,
        origens: x.origens.map((o) => s.coletas.find((c) => c.id === o.coleta_id)?.codigo).join(' '),
      };
    });
    return paraCSV(linhas, [
      { chave: 'data', titulo: 'Data' },
      { chave: 'destino', titulo: 'Destino' },
      { chave: 'tipo', titulo: 'Tipo' },
      { chave: 'cnpj', titulo: 'CNPJ' },
      { chave: 'material', titulo: 'Material' },
      { chave: 'kg', titulo: 'kg' },
      { chave: 'entregas', titulo: 'Entregas de origem' },
      { chave: 'origens', titulo: 'Códigos das entregas' },
    ]);
  });
}
