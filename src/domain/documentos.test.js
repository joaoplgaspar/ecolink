import { describe, it, expect } from 'vitest';
import { validarCNPJ, formatarCNPJ, limparCNPJ, mascararCNPJ, validarCPF, formatarCPF } from './documentos';

describe('CNPJ', () => {
  it.each(['11.222.333/0001-81', '11222333000181', '48.219.357/0001-91'])('aceita CNPJ numérico válido %s', (c) => {
    expect(validarCNPJ(c)).toBe(true);
  });

  it('aceita CNPJ ALFANUMÉRICO (novo formato da Receita, julho/2026) — exemplo oficial', () => {
    expect(validarCNPJ('12.ABC.345/01DE-35')).toBe(true);
    expect(validarCNPJ('12abc34501de35')).toBe(true); // minúsculas e sem pontuação
    expect(validarCNPJ('6R.ZK4.QW8/0001-02')).toBe(true);
  });

  it.each([
    ['dígito errado', '11.222.333/0001-82'],
    ['dígito errado (alfanumérico)', '12.ABC.345/01DE-36'],
    ['todos iguais', '11.111.111/1111-11'],
    ['zeros', '00.000.000/0000-00'],
    ['curto', '11.222.333/0001'],
    ['letra no dígito verificador', '12.ABC.345/01DE-3A'],
    ['vazio', ''],
  ])('recusa %s', (_, c) => {
    expect(validarCNPJ(c)).toBe(false);
  });

  it('formata enquanto digita e mascara para exibir a terceiros', () => {
    expect(formatarCNPJ('11222')).toBe('11.222');
    expect(formatarCNPJ('12abc34501de35')).toBe('12.ABC.345/01DE-35');
    expect(limparCNPJ(' 12.abc.345/01de-35 ')).toBe('12ABC34501DE35');
    expect(mascararCNPJ('11222333000181')).toBe('11.222.***/****-81');
  });
});

describe('CPF', () => {
  it('aceita CPF válido e recusa inválidos', () => {
    expect(validarCPF('529.982.247-25')).toBe(true);
    expect(validarCPF('529.982.247-24')).toBe(false);
    expect(validarCPF('111.111.111-11')).toBe(false);
    expect(validarCPF('123')).toBe(false);
  });

  it('formata enquanto digita', () => {
    expect(formatarCPF('5299822')).toBe('529.982.2');
    expect(formatarCPF('52998224725')).toBe('529.982.247-25');
  });
});
