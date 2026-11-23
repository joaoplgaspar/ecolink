// Fase 7 (LGPD): exportar os próprios dados e excluir (anonimizar) a conta.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { privacidade, auth, avaliacoes, chat, estatisticas, equipe } from './index';
import { ler } from '../storage';
import { SENHA_DEMO } from '../contasDemo';
import { prepararBanco, restaurarRelogio, entrarComo, erroDe, IDS } from '@/test/ambiente';

beforeEach(() => prepararBanco());
afterEach(restaurarRelogio);

describe('exportar meus dados', () => {
  it('traz entregas, extrato, conversas e avaliações — sem senhas, tokens ou códigos', async () => {
    await entrarComo(IDS.ana);
    const d = await privacidade.exportar();
    expect(d.titular).toMatchObject({ nome: 'Ana Recicladora', email: 'ana@email.com' });
    expect(d.entregas.length).toBeGreaterThan(0);
    expect(d.extrato.length).toBeGreaterThan(0);
    expect(d.conversas[0].mensagens[0]).toMatchObject({ de: 'você' });
    const json = JSON.stringify(d);
    expect(json).not.toMatch(/senha_hash|token_hash|codigo_hash|codigo_entrega|pbkdf2/i);
    expect(ler().auditoria.at(-1)).toMatchObject({ acao: 'conta.dados_exportados' });
  });
});

describe('excluir a conta', () => {
  it('pede senha e a palavra EXCLUIR', async () => {
    await entrarComo(IDS.bruno);
    expect(await erroDe(privacidade.excluirConta({ senha: SENHA_DEMO, confirmacao: 'sim' }))).toMatchObject({
      status: 422,
    });
    expect(await erroDe(privacidade.excluirConta({ senha: 'errada', confirmacao: 'EXCLUIR' }))).toMatchObject({
      status: 401,
    });
  });

  it('anonimiza: dados pessoais saem, livro-caixa e notas ficam; entregas futuras são canceladas', async () => {
    const id = IDS.bruno;
    const extratoAntes = ler().extrato.filter((l) => l.usuario_id === id).length;
    const futuras = ler().coletas.filter((c) => c.usuario_id === id && ['solicitada', 'confirmada'].includes(c.status));
    await entrarComo(id);
    await chat.enviar(1, 'Meu telefone é 11 98888-7777');
    await privacidade.excluirConta({ senha: SENHA_DEMO, confirmacao: 'excluir' });

    const u = ler().usuarios.find((x) => x.id === id);
    expect(u).toMatchObject({
      nome: 'Conta excluída',
      telefone: null,
      cidade: null,
      status: 'excluido',
      senha_hash: null,
    });
    expect(u.email).not.toMatch(/bruno/);
    expect(ler().extrato.filter((l) => l.usuario_id === id)).toHaveLength(extratoAntes);
    for (const c of futuras) expect(ler().coletas.find((x) => x.id === c.id).status).toBe('cancelada');
    const msgs = ler().mensagens.filter((m) => m.autor_id === id);
    expect(msgs.every((m) => m.texto === 'Mensagem apagada (conta excluída).')).toBe(true);
    expect(JSON.stringify(ler().mensagens)).not.toMatch(/98888-7777/);
    expect(JSON.stringify(ler().usuarios)).not.toMatch(/bruno@email\.com|Bruno Verde/);
    expect(
      ler()
        .sessoes.filter((x) => x.usuario_id === id)
        .every((x) => x.revogada_em),
    ).toBe(true);
    expect(ler().emails_demo.at(-1)).toMatchObject({
      para: 'bruno@email.com',
      assunto: expect.stringMatching(/excluída/),
    });

    // Não entra mais e some do ranking; as avaliações ficam sem nome.
    expect(await erroDe(auth.entrar('bruno@email.com', SENHA_DEMO))).toMatchObject({ status: 401 });
    await entrarComo(IDS.ana);
    expect((await estatisticas.ranking()).map((r) => r.nome)).not.toContain('Bruno Verde');
    const dele = ler().avaliacoes.filter((a) => a.usuario_id === id);
    if (dele.length)
      expect((await avaliacoes.listar(dele[0].ponto_id)).find((a) => a.id === dele[0].id)).toMatchObject({
        usuario_nome: 'Conta excluída',
        comentario: '',
      });
  });

  it('impedimentos: único gestor de ponto, conta da plataforma', async () => {
    await entrarComo(IDS.marcos, 'cidadao');
    const v = await privacidade.verificarExclusao();
    expect(v.impedimentos.join(' ')).toMatch(/única pessoa na gestão/);
    expect(await erroDe(privacidade.excluirConta({ senha: SENHA_DEMO, confirmacao: 'EXCLUIR' }))).toMatchObject({
      status: 409,
    });
    await entrarComo(IDS.moderacao, 'admin');
    expect((await privacidade.verificarExclusao()).impedimentos[0]).toMatch(/equipe da plataforma/);
  });

  it('quem é operador sai da equipe ao excluir', async () => {
    await entrarComo(IDS.marcos, 'parceiro');
    await equipe.convidar(1, { email: 'joao@email.com', papel: 'operador' });
    const codigo = ler()
      .emails_demo.at(-1)
      .corpo.match(/Código do convite: ([A-Z2-9]{8})/)[1];
    await entrarComo(IDS.joao);
    await equipe.aceitarConvite(codigo);
    await privacidade.excluirConta({ senha: SENHA_DEMO, confirmacao: 'EXCLUIR' });
    expect(ler().membros.find((m) => m.usuario_id === IDS.joao && m.ponto_id === 1).ativo).toBe(false);
  });
});
