// Testes dos repositórios: as regras de negócio e de permissão valem aqui,
// não só na tela. Quem faz a chamada vem da SESSÃO (entrarComo), nunca de um id
// enviado pela tela.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  usuarios,
  pontos,
  coletas,
  avaliacoes,
  resgates,
  chat,
  notificacoes,
  estatisticas,
  parceiro,
  admin,
  demo,
} from './index';
import { ler } from '../storage';
import { limparToken } from '../sessaoCliente';
import { prepararBanco, restaurarRelogio, entrarComo, erroDe, IDS, primeiraJanela } from '@/test/ambiente';

beforeEach(() => prepararBanco());
afterEach(restaurarRelogio);

describe('respostas como uma API', () => {
  it('devolvem cópias: alterar o retorno não altera o "banco"', async () => {
    const lista = await pontos.listar();
    lista[0].nome = 'Hackeado';
    expect((await pontos.obter(lista[0].id)).nome).not.toBe('Hackeado');
  });

  it('pontos e avaliações são públicos; o resto exige login (401)', async () => {
    expect((await pontos.listar()).length).toBeGreaterThan(0);
    expect((await avaliacoes.listar(1)).length).toBeGreaterThanOrEqual(0);
    for (const chamada of [
      () => coletas.minhas(),
      () => notificacoes.listar(),
      () => estatisticas.ranking(),
      () => usuarios.eu(),
    ]) {
      expect(await erroDe(chamada())).toMatchObject({ status: 401 });
    }
  });
});

describe('usuarios', () => {
  beforeEach(() => entrarComo(IDS.ana));

  it('eu() devolve a própria conta sem hash de senha', async () => {
    const u = await usuarios.eu();
    expect(u.id).toBe(IDS.ana);
    expect(u).not.toHaveProperty('senha_hash');
  });

  it('atualizar só aceita campos editáveis (não troca e-mail, papéis nem senha)', async () => {
    const u = await usuarios.atualizar({
      nome: 'Ana B.',
      email: 'outro@email.com',
      papeis: ['admin'],
      senha_hash: 'x',
      id: 99,
    });
    expect(u).toMatchObject({ id: IDS.ana, nome: 'Ana B.', email: 'ana@email.com', papeis: ['cidadao'] });
    expect(ler().usuarios.find((x) => x.id === IDS.ana).senha_hash).toMatch(/^pbkdf2_sha256\$/);
  });

  it('cidadão não consulta outra conta (403); a plataforma consulta (sem hash)', async () => {
    expect(await erroDe(usuarios.obter(IDS.bruno))).toMatchObject({ status: 403 });
    await entrarComo(IDS.admin);
    const bruno = await usuarios.obter(IDS.bruno);
    expect(bruno.nome).toBe('Bruno Verde');
    expect(bruno).not.toHaveProperty('senha_hash');
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

describe('avaliacoes', () => {
  beforeEach(() => entrarComo(IDS.ana));

  it('cria e depois atualiza a mesma avaliação (uma por pessoa)', async () => {
    await avaliacoes.salvar({ ponto_id: 7, nota: 3, comentario: 'ok' });
    await avaliacoes.salvar({ ponto_id: 7, nota: 5, comentario: 'melhorou' });
    const minhas = (await avaliacoes.listar(7)).filter((a) => a.usuario_id === IDS.ana);
    expect(minhas).toHaveLength(1);
    expect(minhas[0]).toMatchObject({ nota: 5, comentario: 'melhorou', usuario_nome: 'Ana Recicladora' });
    expect((await avaliacoes.minha(7)).nota).toBe(5);
  });

  it('valida nota e tamanho do comentário', async () => {
    expect(await erroDe(avaliacoes.salvar({ ponto_id: 1, nota: 6 }))).toMatchObject({ status: 422 });
    expect(await erroDe(avaliacoes.salvar({ ponto_id: 1, nota: 4, comentario: 'x'.repeat(501) }))).toMatchObject({
      status: 422,
    });
  });

  it('o resumo reflete uma nova avaliação', async () => {
    const jaAvaliaram = new Set((await avaliacoes.listar(7)).map((a) => a.usuario_id));
    const novato = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].find((id) => !jaAvaliaram.has(id));
    await entrarComo(novato);
    const antes = await avaliacoes.resumo(7);
    await avaliacoes.salvar({ ponto_id: 7, nota: 1 });
    const depois = await avaliacoes.resumo(7);
    expect(depois.total).toBe(antes.total + 1);
    expect(depois.media).toBeLessThan(antes.total ? antes.media : 2);
  });

  it('quem trabalha no ponto não avalia o próprio ponto', async () => {
    await entrarComo(IDS.marcos, 'cidadao');
    expect(await erroDe(avaliacoes.salvar({ ponto_id: 1, nota: 5 }))).toMatchObject({ status: 422 });
  });
});

describe('resgates', () => {
  it('debita o saldo e gera código de voucher', async () => {
    await entrarComo(IDS.ana);
    const antes = (await estatisticas.minhas()).saldo;
    const r = await resgates.resgatar(3); // 90 EcoPontos
    expect(r.codigo).toMatch(/^ECO-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect((await estatisticas.minhas()).saldo).toBe(antes - 90);
    expect((await resgates.listar())[0].id).toBe(r.id);
  });

  it('recusa sem saldo, mesmo que a tela deixe clicar', async () => {
    await entrarComo(IDS.joao);
    expect(await erroDe(resgates.resgatar(8))).toMatchObject({ status: 422 });
  });

  it('recompensa inexistente → 404 (o custo vem do catálogo, não da tela)', async () => {
    await entrarComo(IDS.ana);
    expect(await erroDe(resgates.resgatar(999))).toMatchObject({ status: 404 });
  });
});

describe('chat', () => {
  beforeEach(() => entrarComo(IDS.ana));

  it('envia mensagem, recebe resposta automática e atualiza a prévia', async () => {
    const msgs = await chat.enviar(2, 'Qual o horário?');
    expect(msgs.at(-2)).toMatchObject({ de: 'eu', texto: 'Qual o horário?' });
    expect(msgs.at(-1).de).toBe('ponto');
    expect(msgs.at(-1).texto).toContain('Seg–Sex 9h–12h e 13h–17h · Sáb 9h–13h');
    expect((await chat.ultimas())['2'].de).toBe('ponto');
  });

  it('não envia mensagem vazia', async () => {
    expect(await erroDe(chat.enviar(2, '   '))).toMatchObject({ status: 422 });
  });

  it('cada pessoa só vê as próprias conversas', async () => {
    await chat.enviar(2, 'Oi');
    await entrarComo(IDS.bruno);
    expect(await chat.mensagens(2)).toEqual([]);
  });
});

describe('notificacoes', () => {
  it('marca como lidas só as da própria conta', async () => {
    await entrarComo(IDS.bruno);
    await coletas.solicitar({ ponto_id: 1, ...(await primeiraJanela(1)), itens: [{ material: 'papel', kg: 1 }] });
    await entrarComo(IDS.ana);
    await notificacoes.marcarTodasLidas();
    expect((await notificacoes.listar()).every((n) => n.lida)).toBe(true);
    await entrarComo(IDS.bruno);
    expect((await notificacoes.listar()).some((n) => !n.lida)).toBe(true);
  });
});

describe('estatisticas', () => {
  it('ranking só com cidadãos (equipe da plataforma não entra)', async () => {
    await entrarComo(IDS.ana);
    const nomes = (await estatisticas.ranking()).map((r) => r.nome);
    expect(nomes).toContain('Ana Recicladora');
    expect(nomes).not.toContain('Equipe ECOLINK');
    expect(nomes).not.toContain('Paula Santos');
  });

  it('no perfil plataforma não há EcoPontos próprios (403)', async () => {
    await entrarComo(IDS.admin);
    expect(await erroDe(estatisticas.minhas())).toMatchObject({ status: 403 });
  });
});

describe('parceiro', () => {
  it('lista os pontos em que trabalha, com papel e resumo', async () => {
    await entrarComo(IDS.marcos, 'parceiro');
    const meus = await parceiro.meusPontos();
    expect(meus.map((p) => p.id).sort()).toEqual([1, 4]);
    expect(meus[0]).toMatchObject({
      papel: 'gestor',
      resumo: expect.objectContaining({ proximas: expect.any(Number) }),
    });
  });

  it('vê os recebimentos do próprio ponto com dados mínimos do cidadão (nunca o código de entrega)', async () => {
    await entrarComo(IDS.marcos, 'parceiro');
    const r = await parceiro.recebimentos(1);
    const todas = [...r.novas, ...r.hoje, ...r.proximas, ...r.finalizadas];
    expect(todas.length).toBeGreaterThan(0);
    for (const c of todas) {
      expect(c.cidadao).toMatch(/^\S+( \S\.)?$/); // "Ana R."
      expect(c).not.toHaveProperty('usuario_id');
      expect(c).not.toHaveProperty('codigo_entrega');
      expect(JSON.stringify(c)).not.toMatch(/@|9999900/); // nada de e-mail ou telefone
    }
  });

  it('não vê recebimentos de ponto em que não trabalha (403)', async () => {
    await entrarComo(IDS.paula, 'parceiro');
    expect(await erroDe(parceiro.recebimentos(1))).toMatchObject({ status: 403 });
  });

  it('cidadão comum não acessa o painel do parceiro (403)', async () => {
    await entrarComo(IDS.ana);
    expect(await erroDe(parceiro.meusPontos())).toMatchObject({ status: 403 });
  });
});

describe('admin', () => {
  it('lista usuários e auditoria; cidadão não (403)', async () => {
    await entrarComo(IDS.ana);
    expect(await erroDe(admin.listarUsuarios())).toMatchObject({ status: 403 });
    expect(await erroDe(admin.auditoria())).toMatchObject({ status: 403 });
    await entrarComo(IDS.moderacao);
    const lista = await admin.listarUsuarios({ busca: 'bruno' });
    expect(lista).toHaveLength(1);
    expect(lista[0]).not.toHaveProperty('senha_hash');
  });

  it('suspender encerra as sessões da pessoa; ela não consegue mais usar o app', async () => {
    const sessaoBruno = await entrarComo(IDS.bruno);
    await entrarComo(IDS.admin);
    expect(await erroDe(admin.alterarStatus(IDS.bruno, 'suspenso'))).toMatchObject({ status: 422 }); // motivo obrigatório
    await admin.alterarStatus(IDS.bruno, 'suspenso', 'Teste de moderação');
    expect(ler().sessoes.find((s) => s.id === sessaoBruno.id).revogada_em).not.toBeNull();
    const registro = (await admin.auditoria({ acao: 'usuario.' }))[0];
    expect(registro).toMatchObject({ acao: 'usuario.suspenso', recurso_id: IDS.bruno, ator_nome: 'Equipe ECOLINK' });
  });

  it('moderação não suspende contas e ninguém suspende a si mesmo', async () => {
    await entrarComo(IDS.moderacao);
    expect(await erroDe(admin.alterarStatus(IDS.bruno, 'suspenso', 'x'))).toMatchObject({ status: 403 });
    await entrarComo(IDS.admin);
    expect(await erroDe(admin.alterarStatus(IDS.admin, 'suspenso', 'x'))).toMatchObject({ status: 403 });
  });
});

describe('demo', () => {
  it('restaurar desfaz as alterações e encerra a sessão desta aba', async () => {
    await entrarComo(IDS.ana);
    await usuarios.atualizar({ nome: 'Outra' });
    await demo.restaurar();
    expect(await erroDe(usuarios.eu())).toMatchObject({ status: 401 });
    await entrarComo(IDS.ana);
    expect((await usuarios.eu()).nome).toBe('Ana Recicladora');
  });

  it('lista as contas de demonstração com papéis', async () => {
    limparToken();
    const contas = await demo.contas();
    expect(contas.find((c) => c.email === 'marcos@email.com').papeis).toEqual(['Gestor de ponto', 'Cidadão']);
  });
});
