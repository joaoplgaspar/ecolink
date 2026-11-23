// Testes da camada Supabase que NÃO precisam de rede: a troca de fonte de dados,
// os módulos "ainda não migrado", a tradução de erros e as projeções para a tela.
// (As regras do banco são testadas com pgTAP em supabase/tests; a jornada, no
// Playwright em e2e/supabase.)
import { describe, it, expect, beforeEach } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { exportacoesDe, moduloNaoMigrado } from '../../../scripts/vite-fonte-dados.js';
import { erroDoSupabase, armazemDaSessao, definirLembrar, haSessaoSalva } from './cliente';
import { paraCidadao } from './repos/coletas';
import { agruparRecebimentos, paraPonto } from './repos/parceiro';
import { ErroApi } from '../erros';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const REPOS_LOCAIS = path.join(AQUI, '..', 'repos');
const nomesDoIndex = [...readFileSync(path.join(REPOS_LOCAIS, 'index.js'), 'utf8').matchAll(/from '\.\/(\w+)'/g)].map(
  (m) => m[1],
);

describe('troca de fonte de dados', () => {
  it('todo repositório do index tem a versão Supabase (senão o bundle levaria o banco local)', () => {
    expect(nomesDoIndex.length).toBeGreaterThan(20);
    for (const nome of nomesDoIndex) expect(existsSync(path.join(AQUI, 'repos', `${nome}.js`)), nome).toBe(true);
  });

  it('os módulos de infraestrutura usados pelas telas também têm versão Supabase', () => {
    for (const nome of ['storage.js', 'sessaoCliente.js']) expect(existsSync(path.join(AQUI, nome)), nome).toBe(true);
  });

  it.each(nomesDoIndex)('repos/%s: a versão Supabase exporta TUDO o que a local exporta', async (nome) => {
    const [local, supa] = await Promise.all([import(`../repos/${nome}.js`), import(`./repos/${nome}.js`)]);
    const faltando = Object.keys(local).filter((k) => !(k in supa));
    expect(faltando).toEqual([]);
  });

  it('nenhum módulo Supabase importa o banco local nem usa a chave service_role', () => {
    const arquivos = [
      ...readdirSync(AQUI).filter((f) => f.endsWith('.js') && !f.endsWith('.test.js')),
      ...readdirSync(path.join(AQUI, 'repos')).map((f) => `repos/${f}`),
    ];
    for (const f of arquivos) {
      const fonte = readFileSync(path.join(AQUI, f), 'utf8');
      expect(fonte, f).not.toMatch(/from '(\.\.\/)+(storage|repos\/\w+|sessaoCliente)'/);
      const codigo = fonte.replace(/^\s*\/\/.*$/gm, ''); // comentários podem citar o aviso
      expect(codigo, f).not.toMatch(/service_role|SERVICE_ROLE/);
    }
  });
});

describe('módulo "ainda não migrado"', () => {
  const fonte = `
export const MAX = 5;
export const ESPERA = 10 * 60_000;
export const ROTULO = 'x';
export const objeto = { a: 1 };
export function listar() {}
export async function salvar() {}
export { nomeReduzido };
`;
  it('lê funções, constantes e reexportações', () => {
    const e = exportacoesDe(fonte);
    expect([...e.keys()].sort()).toEqual(['ESPERA', 'MAX', 'ROTULO', 'listar', 'nomeReduzido', 'objeto', 'salvar']);
    expect(e.get('MAX')).toBe('5');
    expect(e.get('ESPERA')).toBe('10 * 60_000');
    expect(e.get('objeto')).toBeNull(); // não é literal simples: vira função 501
  });

  it('copia constantes simples e troca funções por 501', () => {
    const m = moduloNaoMigrado('teste', fonte);
    expect(m).toContain('export const MAX = 5;');
    expect(m).toContain("export const listar = naoMigrado('listar');");
  });

  it('uma função não migrada responde 501 com o nome dela', async () => {
    const chat = await import('./repos/chat.js');
    await expect(chat.enviar()).rejects.toMatchObject({ status: 501, detalhes: { funcao: 'chat.enviar' } });
    await expect(chat.minhasConversas()).resolves.toEqual([]);
  });
});

describe('erros do Supabase → ErroApi (mesmos status do modo local)', () => {
  it.each([
    [{ code: 'PT403', message: 'Sem permissão aqui.' }, 400, 403, 'Sem permissão aqui.'],
    [{ code: 'PT429', message: 'Limite.' }, 400, 429, 'Limite.'],
    [
      { code: '42501', message: 'permission denied for table extrato' },
      403,
      403,
      'Você não tem permissão para fazer isso.',
    ],
    [{ code: 'PGRST301', message: 'JWT expired' }, 401, 401, 'Sua sessão expirou. Entre novamente.'],
    [{ code: '23505', message: 'duplicate key' }, 409, 409, 'Isso já foi registrado.'],
    [new TypeError('Failed to fetch'), 0, 503, 'Sem conexão com o servidor. Tente novamente.'],
  ])('%o → %i', (erro, status, esperado, mensagem) => {
    const e = erroDoSupabase(erro, status);
    expect(e).toBeInstanceOf(ErroApi);
    expect(e.status).toBe(esperado);
    expect(e.message).toBe(mensagem);
  });

  it('não vaza a mensagem técnica do Postgres para a tela', () => {
    expect(erroDoSupabase({ code: '42501', message: 'permission denied for table extrato' }, 403).message).not.toMatch(
      /table/,
    );
  });
});

describe('sessão por aba', () => {
  const fake = () => {
    const m = new Map();
    return {
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      removeItem: (k) => m.delete(k),
      key: (i) => [...m.keys()][i] ?? null,
      get length() {
        return m.size;
      },
    };
  };
  beforeEach(() => {
    globalThis.sessionStorage = fake();
    globalThis.localStorage = fake();
  });

  it('sem "manter conectado", a sessão fica só nesta aba', () => {
    definirLembrar(false);
    armazemDaSessao.setItem('sb-x-auth-token', 'tok');
    expect(sessionStorage.getItem('sb-x-auth-token')).toBe('tok');
    expect(localStorage.getItem('sb-x-auth-token')).toBeNull();
    expect(haSessaoSalva()).toBe(true);
  });

  it('com "manter conectado", novas abas reabrem a sessão', () => {
    definirLembrar(true);
    armazemDaSessao.setItem('sb-x-auth-token', 'tok');
    expect(localStorage.getItem('sb-x-auth-token')).toBe('tok');
    sessionStorage.removeItem('sb-x-auth-token');
    expect(armazemDaSessao.getItem('sb-x-auth-token')).toBe('tok');
  });

  it('sair apaga dos dois lugares', () => {
    definirLembrar(true);
    armazemDaSessao.setItem('sb-x-auth-token', 'tok');
    armazemDaSessao.removeItem('sb-x-auth-token');
    expect(haSessaoSalva()).toBe(false);
  });
});

describe('projeções para a tela', () => {
  const base = {
    id: 7,
    codigo: 'ECO-ABCDE',
    tipo: 'agendada',
    ponto_id: 1,
    data: '2026-11-25',
    janela_inicio: '09:00',
    janela_fim: '09:30',
    itens: [{ material: 'papel', kg_declarado: 3, kg_aferido: null, status: 'pendente', motivo: null }],
    pontos_creditados: 0,
    criada_em: '2026-11-23T10:00:00Z',
  };

  it('cidadão: código de entrega e QR só quando confirmada', () => {
    const confirmada = paraCidadao({ ...base, status: 'confirmada', entrega: { codigo_entrega: '1234' } });
    expect(confirmada.codigo).toBe('ECO-ABCDE');
    expect(confirmada.codigo_entrega).toBe('1234');
    expect(confirmada.qr).toBeTruthy();
    const solicitada = paraCidadao({ ...base, status: 'solicitada', entrega: null });
    expect(solicitada.codigo_entrega).toBeUndefined();
    expect(solicitada.pode_cancelar).toBe(true);
  });

  it('cidadão: linha do tempo em ordem e sem quem da equipe agiu', () => {
    const r = paraCidadao(
      {
        ...base,
        status: 'confirmada',
        eventos: [
          { id: 2, acao: 'aceitar', para: 'confirmada', ator: 'ponto', em: '2' },
          { id: 1, acao: 'solicitar', para: 'solicitada', ator: 'cidadao', em: '1' },
        ],
      },
      { detalhe: true },
    );
    expect(r.eventos.map((e) => e.quem)).toEqual(['Você', 'O ponto']);
  });

  it('ponto: quem é da equipe e também entregou ali não ganha botões na própria entrega', () => {
    expect(paraPonto({ ...base, status: 'solicitada', cidadao: 'Marcos L.', eu: true }).acoes).toEqual([]);
    expect(paraPonto({ ...base, status: 'solicitada', cidadao: 'Ana R.', eu: false }).acoes).toContain('aceitar');
  });

  it('ponto: agrupa novas, hoje, próximas e finalizadas como o painel espera', () => {
    const g = agruparRecebimentos(
      [
        { ...base, id: 1, status: 'solicitada', responder_ate: '2026-11-24T10:00:00Z' },
        { ...base, id: 2, status: 'confirmada', data: '2026-11-23' },
        { ...base, id: 3, status: 'em_conferencia', data: '2026-11-23' },
        { ...base, id: 4, status: 'confirmada', data: '2026-11-26' },
        { ...base, id: 5, status: 'concluida', data: '2026-11-20' },
      ],
      '2026-11-23',
    );
    expect(g.novas.map((c) => c.id)).toEqual([1]);
    expect(g.hoje.map((c) => c.id).sort()).toEqual([2, 3]);
    expect(g.proximas.map((c) => c.id)).toEqual([4]);
    expect(g.finalizadas.map((c) => c.id)).toEqual([5]);
    expect(g.novas[0]).not.toHaveProperty('usuario_id');
  });
});
