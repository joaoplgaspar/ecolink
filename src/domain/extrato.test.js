import { describe, it, expect } from 'vitest';
import { saldoDe, acumuladoDe, gastoDe } from './extrato';
import { divergencias, problemasDaPesagem } from './antifraude';
import {
  lerQr,
  qrDaColeta,
  qrPessoal,
  novoCodigoColeta,
  novoCodigoEntrega,
  novoCodigoPessoal,
  codigosIguais,
} from './codigos';

const L = (tipo, valor) => ({ tipo, valor });

describe('extrato', () => {
  const lancamentos = [
    L('credito_coleta', 100),
    L('credito_coleta', 50),
    L('resgate', -80),
    L('estorno', -20),
    L('bonus', 10),
  ];
  it('saldo = soma de tudo; acumulado não desconta resgates; gasto é positivo', () => {
    expect(saldoDe(lancamentos)).toBe(60);
    expect(acumuladoDe(lancamentos)).toBe(140);
    expect(gastoDe(lancamentos)).toBe(80);
    expect(saldoDe([])).toBe(0);
  });
});

describe('antifraude da pesagem', () => {
  const item = (material, kg_declarado, kg_aferido, status = 'aprovado', motivo) => ({
    material,
    kg_declarado,
    kg_aferido,
    status,
    motivo,
  });

  it('aponta divergência só quando é grande em proporção E em kg', () => {
    expect(divergencias([item('papel', 2, 3.5)])).toEqual([]); // +75%, mas só 1,5 kg
    expect(divergencias([item('papel', 2, 5)])).toEqual([{ material: 'papel', declarado: 2, aferido: 5 }]);
    expect(divergencias([item('papel', 10, 14)])).toEqual([]); // +40%
    expect(divergencias([item('papel', 2, 9, 'rejeitado', 'sujo')])).toEqual([]);
  });

  it('valida a pesagem antes de concluir', () => {
    expect(problemasDaPesagem([item('papel', 2, 2)], ['papel'])).toEqual([]);
    expect(problemasDaPesagem([], ['papel'])).toEqual(['Registre pelo menos um item.']);
    expect(problemasDaPesagem([item('papel', 2, 0)], ['papel'])[0]).toMatch(/peso aferido/);
    expect(problemasDaPesagem([item('papel', 2, null, 'rejeitado', '')], ['papel'])[0]).toMatch(/por que/);
    expect(problemasDaPesagem([item('pilhas', 1, 1)], ['papel'])[0]).toMatch(/não recebe/);
    expect(problemasDaPesagem([item('papel', 2, 2, 'pendente')], ['papel'])[0]).toMatch(/Aprove ou recuse/);
  });
});

describe('códigos e QR', () => {
  it('gera códigos no formato esperado', () => {
    expect(novoCodigoColeta()).toMatch(/^ECO-[A-Z2-9]{5}$/);
    expect(novoCodigoEntrega()).toMatch(/^\d{4}$/);
    expect(novoCodigoPessoal()).toMatch(/^[A-Z2-9]{8}$/);
  });

  it('lê o QR da coleta e o QR pessoal (e o código pessoal digitado)', () => {
    expect(lerQr(qrDaColeta('ECO-AB2CD', '0427'))).toEqual({ tipo: 'coleta', codigo: 'ECO-AB2CD', entrega: '0427' });
    expect(lerQr(qrPessoal('K7M2Q9XA'))).toEqual({ tipo: 'pessoal', codigo: 'K7M2Q9XA' });
    expect(lerQr(' k7m2q9xa ')).toEqual({ tipo: 'pessoal', codigo: 'K7M2Q9XA' });
    expect(lerQr('https://site-qualquer.com')).toBeNull();
  });

  it('compara códigos', () => {
    expect(codigosIguais('0427', '0427')).toBe(true);
    expect(codigosIguais('0427', '0428')).toBe(false);
    expect(codigosIguais('0427', '042')).toBe(false);
  });
});
