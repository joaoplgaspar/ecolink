// Organizações parceiras (quem opera os pontos de coleta) — ROADMAP §4.1.
//
// rascunho → em_analise → aprovada
//                       ↘ reprovada → (corrige) → em_analise
// Só organização APROVADA cadastra pontos.

import { validarCNPJ, validarCPF } from './documentos';

export const TIPOS_ORGANIZACAO = {
  cooperativa: { rotulo: 'Cooperativa de catadores', documento: 'cnpj' },
  associacao: { rotulo: 'Associação ou ONG', documento: 'cnpj' },
  ecoponto_publico: { rotulo: 'Ecoponto público (prefeitura)', documento: 'cnpj' },
  empresa: { rotulo: 'Empresa privada', documento: 'cnpj' },
  catador_autonomo: { rotulo: 'Catador(a) autônomo(a)', documento: 'cpf' },
};

export const STATUS_ORGANIZACAO = {
  rascunho: { rotulo: 'Cadastro incompleto' },
  em_analise: { rotulo: 'Em análise' },
  aprovada: { rotulo: 'Aprovada' },
  reprovada: { rotulo: 'Precisa de ajustes' },
};

/** Documentos que cada tipo precisa enviar. */
export function documentosExigidos(tipo) {
  const base = {
    comprovante:
      tipo === 'catador_autonomo' ? 'Documento de identidade com foto' : 'Cartão CNPJ (comprovante de inscrição)',
  };
  if (tipo !== 'catador_autonomo') base.licenca = 'Licença ambiental ou alvará de funcionamento';
  return base;
}

export const ETAPAS_ORGANIZACAO = [
  { chave: 'organizacao', rotulo: 'Organização' },
  { chave: 'contato', rotulo: 'Contato' },
  { chave: 'documentos', rotulo: 'Documentos' },
  { chave: 'revisao', rotulo: 'Revisão' },
];

const tam = (v) => String(v ?? '').trim().length;

/** Problemas por etapa do cadastro: { organizacao: [...], contato: [...], documentos: [...] }. */
export function problemasDaOrganizacao(o) {
  const r = { organizacao: [], contato: [], documentos: [] };
  const tipo = TIPOS_ORGANIZACAO[o.tipo];
  if (!tipo) r.organizacao.push('Escolha o tipo de organização.');
  if (tam(o.nome) < 3 || tam(o.nome) > 80) r.organizacao.push('O nome deve ter entre 3 e 80 caracteres.');
  if (tipo?.documento === 'cnpj') {
    if (tam(o.razao_social) < 3 || tam(o.razao_social) > 120) r.organizacao.push('Informe a razão social.');
    if (!validarCNPJ(o.documento))
      r.organizacao.push('CNPJ inválido. Confira os dígitos (CNPJs com letras também são aceitos).');
  }
  if (tipo?.documento === 'cpf' && !validarCPF(o.documento)) r.organizacao.push('CPF inválido. Confira os dígitos.');

  if (tam(o.responsavel_cargo) < 2 || tam(o.responsavel_cargo) > 60) r.contato.push('Informe o seu cargo ou função.');
  if (String(o.telefone ?? '').replace(/\D/g, '').length < 10) r.contato.push('Informe um telefone com DDD.');
  if (tam(o.sobre) > 500) r.contato.push('A apresentação deve ter no máximo 500 caracteres.');

  if (tipo) {
    for (const [chave, rotulo] of Object.entries(documentosExigidos(o.tipo))) {
      if (!(o.documentos || []).some((d) => d.tipo === chave)) r.documentos.push(`Envie: ${rotulo}.`);
    }
  }
  return r;
}

export const organizacaoCompleta = (o) => Object.values(problemasDaOrganizacao(o)).every((l) => l.length === 0);
