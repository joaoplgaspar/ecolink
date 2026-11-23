// Testes dos repositórios: as regras de negócio valem aqui, não só na tela.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { usuarios, pontos, coletas, avaliacoes, resgates, chat, notificacoes, estatisticas, demo } from './index';
import { ler } from '../storage';
import { prepararBanco, restaurarRelogio } from '@/test/ambiente';

const ANA = 1;

/** Captura o erro de uma Promise rejeitada. */
async function erroDe(promessa) {
  try {
    await promessa;
  } catch (e) {
    return e;
  }
  throw new Error('Era esperado um erro, mas a chamada deu certo.');
}

beforeEach(() => prepararBanco());
afterEach(restaurarRelogio);

describe('respostas como uma API', () => {
  it('devolvem cópias: alterar o retorno não altera o "banco"', async () => {
    const lista = await pontos.listar();
    lista[0].nome = 'Hackeado';
    expect((await pontos.obter(lista[0].id)).nome).not.toBe('Hackeado');
  });
});

describe('usuarios', () => {
  it('autentica com e-mail em qualquer caixa e nunca devolve a senha', async () => {
    const u = await usuarios.autenticar('  ANA@email.com ', 'senha123');
    expect(u.id).toBe(ANA);
    expect(u).not.toHaveProperty('senha');
  });

  it('mesma mensagem para e-mail inexistente e senha errada (não revela contas)', async () => {
    const a = await erroDe(usuarios.autenticar('ninguem@email.com', 'x'));
    const b = await erroDe(usuarios.autenticar('ana@email.com', 'errada'));
    expect(a).toMatchObject({ status: 401 });
    expect(b.message).toBe(a.message);
  });

  it('cria conta validando e-mail, senha e duplicidade', async () => {
    expect(await erroDe(usuarios.criar({ nome: 'X', email: 'invalido', senha: '123456' }))).toMatchObject({
      status: 422,
    });
    expect(await erroDe(usuarios.criar({ nome: 'X', email: 'x@email.com', senha: '123' }))).toMatchObject({
      status: 422,
    });
    expect(await erroDe(usuarios.criar({ nome: 'X', email: 'Ana@Email.com', senha: '123456' }))).toMatchObject({
      status: 409,
    });
    const novo = await usuarios.criar({ nome: '  Zé  ', email: 'ZE@email.com', senha: '123456' });
    expect(novo).toMatchObject({ nome: 'Zé', email: 'ze@email.com' });
    expect(novo).not.toHaveProperty('senha');
  });

  it('atualizar só aceita campos editáveis (não troca e-mail nem senha)', async () => {
    const u = await usuarios.atualizar(ANA, { nome: 'Ana B.', email: 'outro@email.com', senha: 'hack', id: 99 });
    expect(u).toMatchObject({ id: ANA, nome: 'Ana B.', email: 'ana@email.com' });
    expect(ler().usuarios.find((x) => x.id === ANA).senha).toBe('senha123');
  });

  it('404 para usuário inexistente', async () => {
    expect(await erroDe(usuarios.obter(999))).toMatchObject({ status: 404 });
  });
});

describe('pontos', () => {
  it('lista com resumo de avaliações e filtra', async () => {
    const todos = await pontos.listar();
    expect(todos[0]).toHaveProperty('avaliacao.media');
    const ativos = await pontos.listar({ ativo: true });
    expect(ativos.every((p) => p.ativo)).toBe(true);
    expect(ativos.length).toBeLessThan(todos.length);
  });

  it('obter traz total de coletas e dá 404 se não existir', async () => {
    expect((await pontos.obter(1)).total_coletas).toBeGreaterThan(0);
    expect(await erroDe(pontos.obter(999))).toMatchObject({ status: 404 });
  });
});

describe('coletas', () => {
  const valida = { usuario_id: ANA, ponto_id: 1, material: 'papel', quantidade_kg: 2, data_agendada: '2026-11-25' };

  it('agenda e notifica o usuário na mesma transação', async () => {
    const antes = (await notificacoes.listar(ANA)).length;
    const c = await coletas.agendar(valida);
    expect(c).toMatchObject({ status: 'agendada', ponto_nome: 'EcoPonto Centro' });
    expect((await notificacoes.listar(ANA)).length).toBe(antes + 1);
  });

  it.each([
    ['ponto inativo', { ponto_id: 6, material: 'vidro' }, 422],
    ['material não aceito', { material: 'pilhas' }, 422],
    ['quantidade zero', { quantidade_kg: 0 }, 422],
    ['quantidade absurda', { quantidade_kg: 10_000 }, 422],
    ['data no passado', { data_agendada: '2026-11-22' }, 422],
    ['data inválida', { data_agendada: 'amanhã' }, 422],
    ['ponto inexistente', { ponto_id: 999 }, 404],
  ])('recusa %s', async (_, troca, status) => {
    expect(await erroDe(coletas.agendar({ ...valida, ...troca }))).toMatchObject({ status });
  });

  it('aceita agendar para hoje', async () => {
    expect(await coletas.agendar({ ...valida, data_agendada: '2026-11-23' })).toMatchObject({ status: 'agendada' });
  });

  it('concluir credita EcoPontos uma única vez', async () => {
    const c = await coletas.agendar(valida);
    const antes = (await estatisticas.doUsuario(ANA)).ecopontos;
    const r = await coletas.concluir(c.id);
    expect(r.pontos).toBe(16); // 2 kg × 8
    expect((await estatisticas.doUsuario(ANA)).ecopontos).toBe(antes + 16);
    expect(await erroDe(coletas.concluir(c.id))).toMatchObject({ status: 409 });
  });

  it('cancelar só vale para coletas agendadas', async () => {
    const c = await coletas.agendar(valida);
    expect((await coletas.cancelar(c.id)).status).toBe('cancelada');
    expect(await erroDe(coletas.cancelar(c.id))).toMatchObject({ status: 409 });
  });

  it('coletas concluídas não podem ser apagadas (lastro dos EcoPontos)', async () => {
    const concluida = (await coletas.listar({ usuario_id: ANA, status: 'concluida' }))[0];
    expect(await erroDe(coletas.remover(concluida.id))).toMatchObject({ status: 409 });
    const c = await coletas.agendar(valida);
    await coletas.remover(c.id);
    expect(await erroDe(coletas.obter(c.id))).toMatchObject({ status: 404 });
  });

  it('lista em ordem decrescente por padrão e crescente com ordem: "asc"', async () => {
    const desc = await coletas.listar({ usuario_id: ANA });
    const asc = await coletas.listar({ usuario_id: ANA, ordem: 'asc' });
    expect(desc[0].data_agendada >= desc.at(-1).data_agendada).toBe(true);
    expect(asc[0].data_agendada <= asc.at(-1).data_agendada).toBe(true);
  });
});

describe('avaliacoes', () => {
  it('cria e depois atualiza a mesma avaliação (uma por pessoa)', async () => {
    await avaliacoes.salvar({ ponto_id: 7, usuario_id: ANA, nota: 3, comentario: 'ok' });
    await avaliacoes.salvar({ ponto_id: 7, usuario_id: ANA, nota: 5, comentario: 'melhorou' });
    const minhas = (await avaliacoes.listar(7)).filter((a) => a.usuario_id === ANA);
    expect(minhas).toHaveLength(1);
    expect(minhas[0]).toMatchObject({ nota: 5, comentario: 'melhorou', usuario_nome: 'Ana Recicladora' });
  });

  it('valida nota e tamanho do comentário', async () => {
    expect(await erroDe(avaliacoes.salvar({ ponto_id: 1, usuario_id: ANA, nota: 6 }))).toMatchObject({ status: 422 });
    expect(
      await erroDe(avaliacoes.salvar({ ponto_id: 1, usuario_id: ANA, nota: 4, comentario: 'x'.repeat(501) })),
    ).toMatchObject({ status: 422 });
  });

  it('o resumo reflete uma nova avaliação', async () => {
    const jaAvaliaram = new Set((await avaliacoes.listar(7)).map((a) => a.usuario_id));
    const novato = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].find((id) => !jaAvaliaram.has(id));
    const antes = await avaliacoes.resumo(7);
    await avaliacoes.salvar({ ponto_id: 7, usuario_id: novato, nota: 1 });
    const depois = await avaliacoes.resumo(7);
    expect(depois.total).toBe(antes.total + 1);
    expect(depois.media).toBeLessThan(antes.total ? antes.media : 2);
  });
});

describe('resgates', () => {
  it('debita o saldo e gera código de voucher', async () => {
    const antes = (await estatisticas.doUsuario(ANA)).saldo;
    const r = await resgates.resgatar(ANA, 3); // 90 EcoPontos
    expect(r.codigo).toMatch(/^ECO-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect((await estatisticas.doUsuario(ANA)).saldo).toBe(antes - 90);
  });

  it('recusa sem saldo, mesmo que a tela deixe clicar', async () => {
    const joao = 10;
    expect(await erroDe(resgates.resgatar(joao, 8))).toMatchObject({ status: 422 });
  });

  it('usa o custo do catálogo, não o informado pela tela', async () => {
    expect(await erroDe(resgates.resgatar(ANA, 999))).toMatchObject({ status: 404 });
  });
});

describe('chat', () => {
  it('envia mensagem, recebe resposta automática e atualiza a prévia', async () => {
    const msgs = await chat.enviar(ANA, 2, 'Qual o horário?');
    expect(msgs.at(-2)).toMatchObject({ de: 'eu', texto: 'Qual o horário?' });
    expect(msgs.at(-1).de).toBe('ponto');
    expect(msgs.at(-1).texto).toContain('Seg-Sáb 9h-17h');
    expect((await chat.ultimas(ANA))['2'].de).toBe('ponto');
  });

  it('não envia mensagem vazia', async () => {
    expect(await erroDe(chat.enviar(ANA, 2, '   '))).toMatchObject({ status: 422 });
  });
});

describe('notificacoes', () => {
  it('marca todas como lidas só para o usuário informado', async () => {
    await coletas.agendar({
      usuario_id: 2,
      ponto_id: 1,
      material: 'papel',
      quantidade_kg: 1,
      data_agendada: '2026-11-30',
    });
    await notificacoes.marcarTodasLidas(ANA);
    expect((await notificacoes.listar(ANA)).every((n) => n.lida)).toBe(true);
    expect((await notificacoes.listar(2)).some((n) => !n.lida)).toBe(true);
  });
});

describe('demo', () => {
  it('restaurar desfaz as alterações', async () => {
    await usuarios.atualizar(ANA, { nome: 'Outra' });
    await demo.restaurar();
    expect((await usuarios.obter(ANA)).nome).toBe('Ana Recicladora');
  });
});
