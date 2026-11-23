import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ler, transacao, assinar, aoMudarEmOutraAba, CHAVE } from './storage';
import { VERSAO_ATUAL } from './migrations';
import { prepararBanco, restaurarRelogio } from '@/test/ambiente';

afterEach(restaurarRelogio);

describe('carregamento', () => {
  it('sem dados salvos, cria o seed e grava no armazenamento', () => {
    const backend = prepararBanco({ inicial: {} });
    expect(ler().usuarios.length).toBeGreaterThan(0);
    expect(JSON.parse(backend.getItem(CHAVE)).meta.schema_version).toBe(VERSAO_ATUAL);
  });

  it('migra dados da chave antiga ("ecolink:v2") e remove a chave antiga', () => {
    const antigo = { seq: {}, usuarios: [{ id: 5, nome: 'Zé', email: 'ze@email.com' }], pontos: [], coletas: [] };
    const backend = prepararBanco({ inicial: { 'ecolink:v2': JSON.stringify(antigo) } });
    expect(ler().usuarios[0].nome).toBe('Zé');
    expect(ler().meta.schema_version).toBe(VERSAO_ATUAL);
    expect(backend.getItem('ecolink:v2')).toBeNull();
    expect(backend.getItem(CHAVE)).not.toBeNull();
  });

  it('dados corrompidos: guarda cópia para diagnóstico e recomeça do seed', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const backend = prepararBanco({ inicial: { [CHAVE]: '{isto não é json' } });
    expect(ler().usuarios.length).toBeGreaterThan(0);
    expect(backend.getItem(`${CHAVE}:corrompido`)).toBe('{isto não é json');
  });
});

describe('transacao', () => {
  beforeEach(() => prepararBanco());

  it('grava e notifica os ouvintes', () => {
    const ouvinte = vi.fn();
    const parar = assinar(ouvinte);
    transacao((s) => {
      s.usuarios[0].nome = 'Novo nome';
    });
    expect(ler().usuarios[0].nome).toBe('Novo nome');
    expect(ouvinte).toHaveBeenCalledWith({ origem: 'local' });
    parar();
  });

  it('é atômica: se a função lançar erro, nada muda', () => {
    const antes = structuredClone(ler());
    expect(() =>
      transacao((s) => {
        s.usuarios[0].nome = 'Pela metade';
        throw new Error('falhou no meio');
      }),
    ).toThrow('falhou no meio');
    expect(ler()).toEqual(antes);
  });

  it('armazenamento cheio vira ErroApi 507 (mensagem amigável) e nada muda', () => {
    const backend = prepararBanco();
    const antes = structuredClone(ler());
    backend.setItem = () => {
      throw Object.assign(new Error('cheio'), { name: 'QuotaExceededError' });
    };
    let erro;
    try {
      transacao((s) => {
        s.usuarios[0].nome = 'Não deveria ficar';
      });
    } catch (e) {
      erro = e;
    }
    expect(erro).toMatchObject({ name: 'ErroApi', status: 507 });
    expect(ler()).toEqual(antes);
  });
});

describe('sincronização entre abas', () => {
  beforeEach(() => prepararBanco());

  it('mudança feita por outra aba invalida o cache e avisa as telas', () => {
    const backend = prepararBanco();
    expect(ler().usuarios[0].nome).toBe('Ana Recicladora');

    // Outra aba grava diretamente no armazenamento compartilhado…
    const deOutraAba = JSON.parse(backend.getItem(CHAVE));
    deOutraAba.usuarios[0].nome = 'Ana (editado em outra aba)';
    backend.setItem(CHAVE, JSON.stringify(deOutraAba));

    // …e o navegador dispara o evento "storage" nesta aba.
    const ouvinte = vi.fn();
    assinar(ouvinte);
    expect(aoMudarEmOutraAba(CHAVE)).toBe(true);
    expect(ouvinte).toHaveBeenCalledWith({ origem: 'outra-aba' });
    expect(ler().usuarios[0].nome).toBe('Ana (editado em outra aba)');
  });

  it('ignora mudanças em outras chaves (ex.: sessão)', () => {
    const ouvinte = vi.fn();
    assinar(ouvinte);
    expect(aoMudarEmOutraAba('ecolink:auth')).toBe(false);
    expect(ouvinte).not.toHaveBeenCalled();
  });
});
