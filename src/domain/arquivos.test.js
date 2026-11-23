import { describe, it, expect } from 'vitest';
import { tipoPorAssinatura, problemasDoArquivo, nomeSeguro, TIPOS_IMAGEM } from './arquivos';

const bytes = (...valores) => new Uint8Array([...valores, ...new Array(16).fill(0)]);
const texto = (t) => new Uint8Array([...t].map((c) => c.charCodeAt(0)));

const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const JPG = bytes(0xff, 0xd8, 0xff, 0xe0);
const PDF = texto('%PDF-1.7 ...............');
const WEBP = texto('RIFF\u0000\u0000\u0000\u0000WEBPVP8 ');
const EXE = texto('MZ\u0090\u0000........ executavel');

describe('assinatura real do arquivo', () => {
  it.each([
    ['PNG', PNG, 'image/png'],
    ['JPG', JPG, 'image/jpeg'],
    ['PDF', PDF, 'application/pdf'],
    ['WEBP', WEBP, 'image/webp'],
    ['executável', EXE, null],
  ])('%s', (_, b, mime) => expect(tipoPorAssinatura(b)).toBe(mime));
});

describe('problemasDoArquivo', () => {
  it('aceita PDF e imagens dentro do limite', () => {
    expect(problemasDoArquivo({ bytes: PDF, tamanho: 1000 })).toEqual([]);
    expect(problemasDoArquivo({ bytes: PNG, tamanho: 1000, aceitos: TIPOS_IMAGEM })).toEqual([]);
  });

  it('recusa executável disfarçado de PDF (não confia na extensão)', () => {
    expect(problemasDoArquivo({ bytes: EXE, tamanho: 1000 })[0]).toMatch(/Formato não aceito/);
  });

  it('recusa PDF onde só imagem é aceita, arquivo vazio e arquivo grande', () => {
    expect(problemasDoArquivo({ bytes: PDF, tamanho: 1000, aceitos: TIPOS_IMAGEM })[0]).toMatch(/JPG, PNG, WEBP/);
    expect(problemasDoArquivo({ bytes: PDF, tamanho: 0 })).toContain('O arquivo está vazio.');
    expect(problemasDoArquivo({ bytes: PDF, tamanho: 6 * 1024 * 1024 })[0]).toMatch(/5 MB/);
  });
});

describe('nomeSeguro', () => {
  it('remove caminho e caracteres perigosos', () => {
    expect(nomeSeguro('C:\\Users\\x\\licença<script>.pdf')).toBe('licençascript.pdf');
    expect(nomeSeguro('../../etc/passwd')).toBe('passwd');
    expect(nomeSeguro('')).toBe('arquivo');
    expect(nomeSeguro('a'.repeat(200))).toHaveLength(80);
  });
});
