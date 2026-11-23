// Autenticação de verdade (com o hash PBKDF2 — por isso estes testes são mais lentos).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { auth, usuarios, demo } from './index';
import { ler, transacao } from '../storage';
import { obterToken, guardarToken } from '../sessaoCliente';
import { ouvir } from '../eventos';
import { SENHA_DEMO } from '../contasDemo';
import { MAX_TENTATIVAS, mascararEmail, descreverDispositivo } from './auth';
import { INATIVIDADE_RESTRITA_MS, VALIDADE_MS } from './_sessao';
import { prepararBanco, restaurarRelogio, erroDe, IDS, AGORA } from '@/test/ambiente';

beforeEach(() => prepararBanco());
afterEach(restaurarRelogio);

const avancar = (ms) => vi.setSystemTime(new Date(Date.now() + ms));

describe('entrar', () => {
  it('com a senha certa abre sessão e guarda só o HASH do token', async () => {
    const sessao = await auth.entrar('ANA@email.com ', SENHA_DEMO);
    expect(sessao).toMatchObject({ perfil: 'cidadao', perfis: ['cidadao'], usuario: { id: IDS.ana } });
    expect(sessao.usuario).not.toHaveProperty('senha_hash');
    const token = obterToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(JSON.stringify(ler())).not.toContain(token);
    expect(ler().auditoria.at(-1)).toMatchObject({ acao: 'login.sucesso', ator_id: IDS.ana });
  });

  it('mesma mensagem para e-mail inexistente e senha errada (não revela contas)', async () => {
    const a = await erroDe(auth.entrar('ninguem@email.com', 'qualquer'));
    const b = await erroDe(auth.entrar('ana@email.com', 'errada'));
    expect(a).toMatchObject({ status: 401 });
    expect(b.message).toBe(a.message);
  });

  it(`bloqueia após ${MAX_TENTATIVAS} erros, com espera progressiva, e libera depois`, async () => {
    for (let i = 1; i < MAX_TENTATIVAS; i++)
      expect(await erroDe(auth.entrar('ana@email.com', 'x'))).toMatchObject({ status: 401 });
    expect(await erroDe(auth.entrar('ana@email.com', 'x'))).toMatchObject({ status: 429, detalhes: { segundos: 30 } });
    // Bloqueada: nem a senha certa entra.
    expect(await erroDe(auth.entrar('ana@email.com', SENHA_DEMO))).toMatchObject({ status: 429 });
    avancar(31_000);
    for (let i = 1; i < MAX_TENTATIVAS; i++) await erroDe(auth.entrar('ana@email.com', 'x'));
    expect(await erroDe(auth.entrar('ana@email.com', 'x'))).toMatchObject({ status: 429, detalhes: { segundos: 60 } }); // 2º bloqueio: 1 min
    avancar(61_000);
    expect((await auth.entrar('ana@email.com', SENHA_DEMO)).usuario.id).toBe(IDS.ana);
    expect(ler().tentativas_login['ana@email.com']).toBeUndefined(); // sucesso zera o contador
  }, 20_000);

  it('o bloqueio também vale para e-mails inexistentes (não denuncia quem existe)', async () => {
    for (let i = 1; i < MAX_TENTATIVAS; i++) await erroDe(auth.entrar('fantasma@email.com', 'x'));
    expect(await erroDe(auth.entrar('fantasma@email.com', 'x'))).toMatchObject({ status: 429 });
  }, 20_000);

  it('log de auditoria registra falhas sem expor o e-mail inteiro nem a senha', async () => {
    await erroDe(auth.entrar('ana@email.com', 'minha-senha-errada'));
    const r = ler().auditoria.at(-1);
    expect(r).toMatchObject({ acao: 'login.falha', detalhes: { email: 'a**@email.com' } });
    expect(JSON.stringify(ler().auditoria)).not.toContain('minha-senha-errada');
  });

  it('conta suspensa não entra, mesmo com a senha certa', async () => {
    transacao((s) => {
      s.usuarios.find((u) => u.id === IDS.ana).status = 'suspenso';
    });
    expect(await erroDe(auth.entrar('ana@email.com', SENHA_DEMO))).toMatchObject({ status: 403 });
  });

  it('senha antiga em texto (versões anteriores) recebe hash no primeiro login', async () => {
    transacao((s) => {
      const u = s.usuarios.find((x) => x.id === IDS.bruno);
      delete u.senha_hash;
      u.senha_legada = 'antiga-123';
    });
    await auth.entrar('bruno@email.com', 'antiga-123');
    const u = ler().usuarios.find((x) => x.id === IDS.bruno);
    expect(u.senha_legada).toBeUndefined();
    expect(u.senha_hash).toMatch(/^pbkdf2_sha256\$600000\$/);
  });

  it('protegerSenhasLegadas() calcula o hash de todas as senhas em texto', async () => {
    transacao((s) => {
      for (const u of s.usuarios.slice(0, 2)) {
        delete u.senha_hash;
        u.senha_legada = 'texto-puro-1';
      }
    });
    expect(await auth.protegerSenhasLegadas()).toBe(2);
    expect(JSON.stringify(ler().usuarios)).not.toContain('texto-puro-1');
  });
});

describe('cadastrar', () => {
  const dados = { nome: 'Zélia Novaes', email: 'ze@email.com', senha: 'Composteira-2026', aceitouTermos: true };

  it('cria conta de cidadão, já logada, com hash e aceite dos termos', async () => {
    const sessao = await auth.cadastrar(dados);
    expect(sessao).toMatchObject({ perfil: 'cidadao', usuario: { email: 'ze@email.com', papeis: ['cidadao'] } });
    const u = ler().usuarios.find((x) => x.email === 'ze@email.com');
    expect(u.senha_hash).not.toContain('Composteira');
    expect(u.aceite_termos.versao).toBe(1);
  });

  it.each([
    ['senha curta', { senha: 'abc' }, /pelo menos 8/],
    ['senha comum', { senha: 'senha123' }, /muito comum/],
    ['senha com o nome', { senha: 'zelia-2026-abc' }, /nome/],
    ['sem aceitar os termos', { aceitouTermos: false }, /Termos/],
    ['e-mail inválido', { email: 'ze@' }, /e-mail válido/],
  ])('recusa %s', async (_, troca, mensagem) => {
    expect(await erroDe(auth.cadastrar({ ...dados, ...troca }))).toMatchObject({
      status: 422,
      message: expect.stringMatching(mensagem),
    });
  });

  it('e-mail já cadastrado (em qualquer caixa) → 409', async () => {
    expect(await erroDe(auth.cadastrar({ ...dados, email: 'Ana@Email.com' }))).toMatchObject({ status: 409 });
  });
});

describe('sessão', () => {
  it('expira após 7 dias sem uso e avisa a interface', async () => {
    await auth.entrar('ana@email.com', SENHA_DEMO);
    const aviso = vi.fn();
    const parar = ouvir('sessao-invalida', aviso);
    avancar(VALIDADE_MS + 1000);
    expect(await erroDe(auth.sessaoAtual())).toMatchObject({ status: 401 });
    expect(aviso).toHaveBeenCalledWith(expect.objectContaining({ motivo: 'expirada' }));
    parar();
  });

  it('cada uso renova o prazo (sessão deslizante)', async () => {
    await auth.entrar('ana@email.com', SENHA_DEMO);
    for (let i = 0; i < 3; i++) {
      avancar(VALIDADE_MS - 60_000); // quase 7 dias…
      await auth.sessaoAtual(); // …e usa de novo
    }
    expect((await auth.sessaoAtual()).usuario.id).toBe(IDS.ana);
  });

  it('perfis parceiro/plataforma expiram após 30 min de inatividade; cidadão não', async () => {
    await auth.entrar('marcos@email.com', SENHA_DEMO);
    expect((await auth.sessaoAtual()).perfil).toBe('parceiro');
    avancar(INATIVIDADE_RESTRITA_MS + 1000);
    expect(await erroDe(auth.sessaoAtual())).toMatchObject({ status: 401, detalhes: { motivo: 'inatividade' } });

    await auth.entrar('ana@email.com', SENHA_DEMO);
    avancar(INATIVIDADE_RESTRITA_MS + 1000);
    expect((await auth.sessaoAtual()).perfil).toBe('cidadao');
  });

  it('sair encerra a sessão no "servidor": o token antigo deixa de valer', async () => {
    await auth.entrar('ana@email.com', SENHA_DEMO);
    const token = obterToken();
    await auth.sair();
    expect(obterToken()).toBeNull();
    guardarToken(token); // alguém que copiou o token…
    expect(await erroDe(auth.sessaoAtual())).toMatchObject({ status: 401, detalhes: { motivo: 'encerrada' } });
  });

  it('troca de perfil só para perfis que a pessoa tem', async () => {
    const s = await auth.entrar('marcos@email.com', SENHA_DEMO);
    expect(s.perfis).toEqual(['cidadao', 'parceiro']);
    expect(s.perfil).toBe('parceiro');
    expect((await auth.trocarPerfil('cidadao')).perfil).toBe('cidadao');
    expect(await erroDe(auth.trocarPerfil('admin'))).toMatchObject({ status: 403 });
    await auth.sair();
    expect((await auth.entrar('marcos@email.com', SENHA_DEMO)).perfil).toBe('cidadao'); // reabre no último usado
  });

  it('lista sessões e encerra as outras ("sair de todos os outros dispositivos")', async () => {
    await auth.entrar('ana@email.com', SENHA_DEMO);
    const tokenOutroAparelho = obterToken();
    await auth.entrar('ana@email.com', SENHA_DEMO);
    const lista = await auth.listarSessoes();
    expect(lista).toHaveLength(2);
    expect(lista[0].atual).toBe(true);
    expect(await auth.encerrarOutrasSessoes()).toBe(1);
    expect(await auth.listarSessoes()).toHaveLength(1);
    guardarToken(tokenOutroAparelho);
    expect(await erroDe(auth.sessaoAtual())).toMatchObject({ status: 401 });
  });
});

describe('senha', () => {
  it('trocar exige a senha atual e encerra as outras sessões', async () => {
    await auth.entrar('ana@email.com', SENHA_DEMO);
    const outro = obterToken();
    await auth.entrar('ana@email.com', SENHA_DEMO);
    expect(await erroDe(auth.trocarSenha('errada', 'Nova-senha-forte-1'))).toMatchObject({ status: 401 });
    expect(await erroDe(auth.trocarSenha(SENHA_DEMO, SENHA_DEMO))).toMatchObject({ status: 422 });
    await auth.trocarSenha(SENHA_DEMO, 'Nova-senha-forte-1');
    expect((await auth.sessaoAtual()).usuario.id).toBe(IDS.ana); // a atual continua
    guardarToken(outro);
    expect(await erroDe(auth.sessaoAtual())).toMatchObject({ status: 401 });
    await auth.sair();
    expect((await auth.entrar('ana@email.com', 'Nova-senha-forte-1')).usuario.id).toBe(IDS.ana);
    expect((await demo.emails())[0]).toMatchObject({ para: 'ana@email.com', assunto: 'Sua senha foi alterada' });
  }, 20_000);

  it('recuperação: resposta idêntica para quem existe e quem não existe', async () => {
    const a = await auth.solicitarRecuperacao('ana@email.com');
    const b = await auth.solicitarRecuperacao('ninguem@email.com');
    expect(a).toEqual(b);
    expect(await demo.emails()).toHaveLength(1); // só a conta real recebe e-mail
  });

  it('recuperação: o código chega por "e-mail", vale uma vez e encerra todas as sessões', async () => {
    await auth.entrar('ana@email.com', SENHA_DEMO);
    const tokenAntigo = obterToken();
    await auth.solicitarRecuperacao('ana@email.com');
    const codigo = (await demo.emails())[0].corpo.match(/\d{6}/)[0];
    expect(JSON.stringify(ler().recuperacoes)).not.toContain(codigo); // só o hash fica salvo

    expect(
      await erroDe(auth.redefinirSenha({ email: 'ana@email.com', codigo: '000000', novaSenha: 'Outra-senha-boa-9' })),
    ).toMatchObject({ status: 400 });
    await auth.redefinirSenha({ email: 'ana@email.com', codigo, novaSenha: 'Outra-senha-boa-9' });
    expect(
      await erroDe(auth.redefinirSenha({ email: 'ana@email.com', codigo, novaSenha: 'Mais-uma-senha-7' })),
    ).toMatchObject({ status: 400 });
    guardarToken(tokenAntigo);
    expect(await erroDe(auth.sessaoAtual())).toMatchObject({ status: 401 });
    expect((await auth.entrar('ana@email.com', 'Outra-senha-boa-9')).usuario.id).toBe(IDS.ana);
  }, 20_000);

  it('recuperação: código expira em 15 minutos e é queimado após 5 erros', async () => {
    await auth.solicitarRecuperacao('ana@email.com');
    const codigo = (await demo.emails())[0].corpo.match(/\d{6}/)[0];
    for (let i = 0; i < 5; i++)
      await erroDe(auth.redefinirSenha({ email: 'ana@email.com', codigo: '999999', novaSenha: 'Outra-senha-boa-9' }));
    expect(
      await erroDe(auth.redefinirSenha({ email: 'ana@email.com', codigo, novaSenha: 'Outra-senha-boa-9' })),
    ).toMatchObject({ status: 400 });

    await auth.solicitarRecuperacao('ana@email.com');
    const novo = (await demo.emails())[0].corpo.match(/\d{6}/)[0];
    avancar(15 * 60_000 + 1000);
    expect(
      await erroDe(auth.redefinirSenha({ email: 'ana@email.com', codigo: novo, novaSenha: 'Outra-senha-boa-9' })),
    ).toMatchObject({ status: 400 });
  });

  it('limita pedidos de recuperação (3 a cada 15 min), em silêncio', async () => {
    for (let i = 0; i < 5; i++) await auth.solicitarRecuperacao('ana@email.com');
    expect(await demo.emails()).toHaveLength(3);
  });
});

describe('termos', () => {
  it('aceitar registra a versão e a data', async () => {
    transacao((s) => {
      s.usuarios.find((u) => u.id === IDS.ana).aceite_termos = null;
    });
    await auth.entrar('ana@email.com', SENHA_DEMO);
    const u = await auth.aceitarTermos();
    expect(u.aceite_termos).toEqual({ versao: 1, em: AGORA.toISOString() });
    expect((await usuarios.eu()).aceite_termos.versao).toBe(1);
  });
});

describe('utilitários', () => {
  it('mascara e-mails para logs', () => {
    expect(mascararEmail('ana@email.com')).toBe('a**@email.com');
    expect(mascararEmail('invalido')).toBe('***');
  });

  it('descreve o dispositivo pelo user agent', () => {
    expect(descreverDispositivo('Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36')).toBe('Chrome no Windows');
    expect(descreverDispositivo('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Version/17.0 Safari/604.1')).toBe(
      'Safari no iOS',
    );
    expect(descreverDispositivo('')).toBe('Dispositivo desconhecido');
  });
});
