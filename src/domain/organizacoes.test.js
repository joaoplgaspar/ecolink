import { describe, it, expect } from 'vitest';
import { problemasDaOrganizacao, organizacaoCompleta, documentosExigidos } from './organizacoes';

const valida = {
  tipo: 'cooperativa',
  nome: 'Recicla Juntos',
  razao_social: 'Cooperativa Recicla Juntos',
  documento: '11.222.333/0001-81',
  responsavel_cargo: 'Presidente',
  telefone: '(11) 98888-7777',
  documentos: [
    { tipo: 'comprovante', ref: 'a' },
    { tipo: 'licenca', ref: 'b' },
  ],
};

describe('organização', () => {
  it('completa quando tudo está preenchido', () => {
    expect(problemasDaOrganizacao(valida)).toEqual({ organizacao: [], contato: [], documentos: [] });
    expect(organizacaoCompleta(valida)).toBe(true);
  });

  it('aponta o problema na etapa certa', () => {
    const r = problemasDaOrganizacao({ ...valida, documento: '11.222.333/0001-82', telefone: '1234', documentos: [] });
    expect(r.organizacao[0]).toMatch(/CNPJ inválido/);
    expect(r.contato[0]).toMatch(/DDD/);
    expect(r.documentos).toHaveLength(2);
  });

  it('catador autônomo usa CPF e não precisa de licença', () => {
    expect(Object.keys(documentosExigidos('catador_autonomo'))).toEqual(['comprovante']);
    const catador = {
      ...valida,
      tipo: 'catador_autonomo',
      documento: '529.982.247-25',
      razao_social: '',
      documentos: [{ tipo: 'comprovante' }],
    };
    expect(organizacaoCompleta(catador)).toBe(true);
    expect(problemasDaOrganizacao({ ...catador, documento: '11.222.333/0001-81' }).organizacao[0]).toMatch(
      /CPF inválido/,
    );
  });
});
