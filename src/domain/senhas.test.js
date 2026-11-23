import { describe, it, expect } from 'vitest';
import {
  gerarHash,
  verificarHash,
  precisaRefazerHash,
  problemasDaSenha,
  forcaDaSenha,
  tokenAleatorio,
  codigoNumerico,
  sha256,
} from './senhas';
import { SENHA_DEMO, HASH_SENHA_DEMO } from '../data/contasDemo';

describe('hash de senha (PBKDF2)', () => {
  it('confere a senha certa e recusa a errada', async () => {
    const hash = await gerarHash('minha senha boa', { iteracoes: 1000 });
    expect(hash).toMatch(/^pbkdf2_sha256\$1000\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
    expect(await verificarHash('minha senha boa', hash)).toBe(true);
    expect(await verificarHash('minha senha boA', hash)).toBe(false);
  });

  it('usa sal aleatório: a mesma senha gera hashes diferentes', async () => {
    expect(await gerarHash('igual', { iteracoes: 1000 })).not.toBe(await gerarHash('igual', { iteracoes: 1000 }));
  });

  it('o hash fixo das contas de demonstração corresponde à senha documentada', async () => {
    expect(await verificarHash(SENHA_DEMO, HASH_SENHA_DEMO)).toBe(true);
  });

  it('formatos inválidos nunca conferem', async () => {
    for (const ruim of [null, '', 'texto', 'md5$1$a$b', 'pbkdf2_sha256$abc$a$b', 'pbkdf2_sha256$10$###$###']) {
      expect(await verificarHash('x', ruim)).toBe(false);
    }
  });

  it('pede novo hash quando as iterações estão abaixo do padrão', () => {
    expect(precisaRefazerHash('pbkdf2_sha256$1000$a$b')).toBe(true);
    expect(precisaRefazerHash(HASH_SENHA_DEMO)).toBe(false);
  });
});

describe('política de senha', () => {
  it.each([
    ['curta', 'abc12', /pelo menos 8/],
    ['comum', 'senha123', /muito comum/],
    ['comum com acento/maiúscula', 'Reciclágem', /muito comum/],
    ['repetida', 'aaaaaaaaaa', /repetido/],
  ])('recusa senha %s', (_, senha, mensagem) => {
    expect(problemasDaSenha(senha)).toEqual(expect.arrayContaining([expect.stringMatching(mensagem)]));
  });

  it('recusa senha com o e-mail ou o nome da pessoa', () => {
    expect(problemasDaSenha('carlinha2026!', { email: 'carlinha@email.com' })).toContain(
      'Não use seu e-mail na senha.',
    );
    expect(problemasDaSenha('marcos-2026-x', { nome: 'Marcos Lima' })).toContain('Não use seu nome na senha.');
  });

  it('aceita frase-senha longa sem exigir símbolos', () => {
    expect(problemasDaSenha('girassol azul na janela')).toEqual([]);
  });

  it('medidor de força cresce com tamanho e variedade', () => {
    expect(forcaDaSenha('').nivel).toBe(0);
    expect(forcaDaSenha('senha123').rotulo).toBe('Fraca');
    expect(forcaDaSenha('abcdefgh').nivel).toBeLessThan(forcaDaSenha('Girassol-Azul-2026').nivel);
    expect(forcaDaSenha('Girassol-Azul-2026').rotulo).toBe('Excelente');
  });
});

describe('aleatoriedade', () => {
  it('tokens são longos, url-safe e não se repetem', () => {
    const t = new Set(Array.from({ length: 50 }, () => tokenAleatorio()));
    expect(t.size).toBe(50);
    for (const x of t) expect(x).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('códigos numéricos têm o tamanho pedido', () => {
    expect(codigoNumerico(6)).toMatch(/^\d{6}$/);
  });

  it('sha256 confere com o valor conhecido', async () => {
    expect(await sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
