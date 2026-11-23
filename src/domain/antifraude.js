// Regras antifraude e de qualidade da PESAGEM (ROADMAP §9.4).

import { MATERIAIS } from './materiais';

export const KG_MAX_ITEM = 500;
/** Divergência relevante: aferido > 150% do declarado E pelo menos 2 kg a mais. */
export const DIVERGENCIA = { fator: 1.5, minimoKg: 2 };

export const MOTIVOS_RECUSA = [
  'Agenda lotada nesse horário',
  'Não estaremos funcionando nesse dia',
  'Não recebemos esse material agora',
  'Quantidade acima do que conseguimos receber',
  'Outro motivo',
];

export const MOTIVOS_REJEICAO_ITEM = [
  'Material sujo ou contaminado',
  'Material diferente do declarado',
  'Fora das condições do ponto',
  'Material perigoso',
  'Outro motivo',
];

const SLUGS = new Set(MATERIAIS.map((m) => m.slug));

/** Itens com peso aferido muito acima do declarado (pede confirmação dupla e fica registrado). */
export function divergencias(itens = []) {
  return itens
    .filter((i) => i.status === 'aprovado' && i.kg_declarado > 0)
    .filter(
      (i) => i.kg_aferido > i.kg_declarado * DIVERGENCIA.fator && i.kg_aferido - i.kg_declarado >= DIVERGENCIA.minimoKg,
    )
    .map((i) => ({ material: i.material, declarado: i.kg_declarado, aferido: i.kg_aferido }));
}

/** Problemas da pesagem (lista vazia = pode concluir). */
export function problemasDaPesagem(itens = [], materiaisAceitos = []) {
  const p = [];
  if (!itens.length) p.push('Registre pelo menos um item.');
  for (const i of itens) {
    if (!SLUGS.has(i.material) || !materiaisAceitos.includes(i.material)) p.push(`O ponto não recebe ${i.material}.`);
    if (i.status === 'aprovado') {
      if (!(Number.isFinite(i.kg_aferido) && i.kg_aferido > 0 && i.kg_aferido <= KG_MAX_ITEM))
        p.push(`Informe o peso aferido de ${i.material} (até ${KG_MAX_ITEM} kg).`);
    } else if (i.status === 'rejeitado') {
      if (String(i.motivo || '').trim().length < 3) p.push(`Informe por que ${i.material} foi recusado.`);
    } else {
      p.push(`Aprove ou recuse o item ${i.material}.`);
    }
  }
  return p;
}
