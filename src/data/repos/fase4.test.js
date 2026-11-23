// Fase 4: avaliações verificadas nos dois sentidos, resposta pública e reputação
// com consequências (bloqueio por faltas, limite para reputação Restrita).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { avaliacoes, parceiro, reputacao, coletas, pontos, demo, notificacoes, admin } from './index';
import { ler, transacao } from '../storage';
import { prepararBanco, restaurarRelogio, entrarComo, erroDe, IDS, primeiraJanela } from '@/test/ambiente';

const ID = { ...IDS, diego: 4, felipe: 6 };

beforeEach(() => prepararBanco());
afterEach(restaurarRelogio);

/** Conclui a entrega de hoje do Diego (check-in + pesagem pelo Marcos) e devolve a coleta. */
async function entregaConcluida() {
  const c = ler().coletas.find(
    (x) => x.usuario_id === ID.diego && x.status === 'confirmada' && x.data === '2026-11-23',
  );
  await entrarComo(ID.marcos, 'parceiro');
  await parceiro.checkin(c.id, c.codigo_entrega);
  await parceiro.registrarPesagem(
    c.id,
    c.itens.map((i) => ({ material: i.material, kg_aferido: i.kg_declarado, status: 'aprovado' })),
  );
  return c;
}

describe('cidadão avalia o ponto (avaliação verificada)', () => {
  it('só depois da conferência; aparece com selo de verificada e nome reduzido', async () => {
    const pendente = ler().coletas.find((x) => x.usuario_id === ID.diego && x.status === 'confirmada');
    await entrarComo(ID.diego);
    expect(await erroDe(avaliacoes.avaliarPonto({ coleta_id: pendente.id, nota: 5 }))).toMatchObject({ status: 409 });

    const c = await entregaConcluida();
    await entrarComo(ID.diego);
    expect((await avaliacoes.daColeta(c.id)).pode_avaliar).toBe(true);
    await avaliacoes.avaliarPonto({
      coleta_id: c.id,
      nota: 5,
      tags: ['Atendimento rápido'],
      comentario: 'Rápido e organizado',
    });
    const publica = (await avaliacoes.listar(1))[0];
    expect(publica).toMatchObject({
      usuario_nome: 'Diego S.',
      nota: 5,
      verificada: true,
      tags: ['Atendimento rápido'],
    });
    expect(JSON.stringify(publica)).not.toMatch(/usuario_id|coleta_id/);
    await entrarComo(ID.marcos, 'parceiro');
    expect((await notificacoes.listar())[0].texto).toMatch(/Nova avaliação de Diego S\./);
  });

  it('uma por entrega: avaliar de novo edita (até 7 dias)', async () => {
    const c = await entregaConcluida();
    await entrarComo(ID.diego);
    await avaliacoes.avaliarPonto({ coleta_id: c.id, nota: 3 });
    await avaliacoes.avaliarPonto({ coleta_id: c.id, nota: 4 });
    expect(ler().avaliacoes.filter((a) => a.coleta_id === c.id)).toHaveLength(1);
    expect(ler().avaliacoes.find((a) => a.coleta_id === c.id).nota).toBe(4);
    vi.setSystemTime(new Date('2026-12-01T12:00:00'));
    await entrarComo(ID.diego); // 8 dias depois a sessão anterior já expirou (validade de 7 dias)
    expect(await erroDe(avaliacoes.avaliarPonto({ coleta_id: c.id, nota: 1 }))).toMatchObject({
      status: 409,
      message: expect.stringMatching(/7 dias/),
    });
  });

  it('outra pessoa não avalia a entrega alheia; destaques fora da lista são recusados', async () => {
    const c = await entregaConcluida();
    await entrarComo(ID.ana);
    expect(await erroDe(avaliacoes.avaliarPonto({ coleta_id: c.id, nota: 1 }))).toMatchObject({ status: 403 });
    await entrarComo(ID.diego);
    expect(
      await erroDe(avaliacoes.avaliarPonto({ coleta_id: c.id, nota: 5, tags: ['Melhor ponto do mundo'] })),
    ).toMatchObject({ status: 422 });
  });
});

describe('ponto responde e avalia o cidadão', () => {
  it('responde publicamente; a equipe de outro ponto não pode', async () => {
    const c = await entregaConcluida();
    await entrarComo(ID.diego);
    const a = await avaliacoes.avaliarPonto({ coleta_id: c.id, nota: 4 });
    await entrarComo(ID.paula, 'parceiro');
    expect(await erroDe(avaliacoes.responder(a.id, 'Obrigado!'))).toMatchObject({ status: 403 });
    await entrarComo(ID.marcos, 'parceiro');
    await avaliacoes.responder(a.id, 'Obrigado pela visita, Diego!');
    expect((await avaliacoes.listar(1))[0].resposta.texto).toBe('Obrigado pela visita, Diego!');
    await entrarComo(ID.diego);
    expect((await notificacoes.listar())[0].texto).toMatch(/respondeu à sua avaliação/);
  });

  it('avalia o cidadão; ele vê a avaliação e ela entra na reputação dele', async () => {
    const c = await entregaConcluida();
    expect((await parceiro.obterColeta(c.id)).pode_avaliar_cidadao).toBe(true);
    await parceiro.avaliarCidadao({ coleta_id: c.id, nota: 5, tags: ['Material bem separado'] });
    expect((await parceiro.obterColeta(c.id)).pode_avaliar_cidadao).toBe(false);
    await entrarComo(ID.paula, 'parceiro');
    expect(await erroDe(parceiro.avaliarCidadao({ coleta_id: c.id, nota: 1 }))).toMatchObject({ status: 403 });
    await entrarComo(ID.diego);
    expect((await avaliacoes.daColeta(c.id)).recebida).toMatchObject({ nota: 5, tags: ['Material bem separado'] });
    expect((await reputacao.minha()).avaliacoes_recebidas[0]).toMatchObject({ nota: 5, ponto_nome: 'EcoPonto Centro' });
  });

  it('o ponto vê só score e faixa do cidadão — nunca os detalhes', async () => {
    await entrarComo(ID.marcos, 'parceiro');
    const { novas } = await parceiro.recebimentos(1);
    expect(novas[0].reputacao_cidadao).toEqual({
      score: expect.any(Number),
      faixa: expect.any(String),
      tom: expect.any(String),
      novo: expect.any(Boolean),
    });
    expect(JSON.stringify(novas[0])).not.toMatch(/componentes|dicas|avaliacoes_recebidas/);
  });
});

describe('consequências da reputação', () => {
  it('Felipe: 2 faltas → aviso; a 3ª (simulada) bloqueia novos agendamentos por 7 dias', async () => {
    await entrarComo(ID.felipe);
    const antes = await reputacao.minha();
    expect(antes.restricoes).toMatchObject({ faltas_recentes: 2, faltam_para_bloqueio: 1, bloqueado_ate: null });
    expect(antes.dicas[0]).toMatch(/Mais uma bloqueia/);

    await demo.simularTempo(48); // a entrega confirmada de amanhã vira "não compareceu"
    expect((await notificacoes.listar()).some((n) => /bloqueados até/.test(n.texto))).toBe(true);
    const depois = await reputacao.minha();
    expect(depois.restricoes.bloqueado_ate).not.toBeNull();
    expect(depois.score).toBeLessThan(antes.score);
    const janela = await primeiraJanela(7);
    expect(
      await erroDe(coletas.solicitar({ ponto_id: 7, ...janela, itens: [{ material: 'papel', kg: 1 }] })),
    ).toMatchObject({
      status: 403,
      detalhes: { codigo: 'bloqueio_faltas' },
    });
  });

  it('reputação Restrita: só 1 entrega em aberto e sem aceite automático', async () => {
    // João com histórico ruim antigo (faltas há mais de 30 dias: não bloqueiam, mas pesam).
    transacao((s) => {
      const u = s.usuarios.find((x) => x.id === ID.joao);
      u.telefone = '';
      u.cidade = '';
      for (let i = 0; i < 5; i++) {
        s.coletas.push({
          id: 9000 + i,
          usuario_id: ID.joao,
          ponto_id: 4,
          status: 'nao_compareceu',
          data: `2026-09-0${i + 1}`,
          itens: [],
          confirmada_em: 'x',
        });
      }
      s.coletas.push({
        id: 9100,
        usuario_id: ID.joao,
        ponto_id: 4,
        status: 'rejeitada',
        data: '2026-09-10',
        itens: [{ material: 'papel', kg_declarado: 3, status: 'rejeitado' }],
        confirmada_em: 'x',
      });
      s.coletas = s.coletas.filter((c) => !(c.usuario_id === ID.joao && c.status === 'solicitada'));
    });
    await entrarComo(ID.joao);
    const rep = await reputacao.minha();
    expect(rep.faixa.chave).toBe('restrito');
    const c = await coletas.solicitar({
      ponto_id: 7,
      ...(await primeiraJanela(7)),
      itens: [{ material: 'papel', kg: 1 }],
    });
    expect(c.status).toBe('solicitada'); // ponto 7 tem aceite automático, mas não para reputação Restrita
    expect(
      await erroDe(
        coletas.solicitar({
          ponto_id: 1,
          ...(await primeiraJanela(1, { dataMin: '2026-11-24' })),
          itens: [{ material: 'papel', kg: 1 }],
        }),
      ),
    ).toMatchObject({
      status: 429,
      message: expect.stringMatching(/Restrito.*1 entrega/),
    });
  });
});

describe('reputação dos pontos', () => {
  it('pública, com selos e sem o alerta interno de revisão', async () => {
    const p = await pontos.obter(1);
    expect(p.reputacao.selos).toContain('Parceiro verificado');
    expect(p.reputacao.score).toBeGreaterThan(0);
    const r = await reputacao.doPonto(1);
    expect(r.componentes.map((c) => c.chave)).toEqual([
      'avaliacoes',
      'cumprimento',
      'resposta',
      'agilidade',
      'verificacao',
      'conduta',
    ]);
    expect(r).not.toHaveProperty('alerta_revisao');
    await entrarComo(ID.marcos, 'parceiro');
    expect(await parceiro.reputacaoDoPonto(1)).toHaveProperty('alerta_revisao', false);
  });

  it('avaliações não verificadas (versões antigas) não entram na média', async () => {
    transacao((s) => {
      s.avaliacoes.push({
        id: 999,
        ponto_id: 1,
        usuario_id: 3,
        usuario_nome: 'X',
        nota: 1,
        verificada: false,
        em: '2026-11-01T00:00:00Z',
      });
    });
    const antes = (await avaliacoes.resumo(1)).total;
    expect((await avaliacoes.listar(1)).some((a) => a.id === 999 && !a.verificada)).toBe(true);
    expect((await avaliacoes.resumo(1)).total).toBe(antes);
  });

  it('a plataforma vê a reputação dos cidadãos na lista de usuários', async () => {
    await entrarComo(ID.admin);
    const lista = await admin.listarUsuarios({ busca: 'felipe' });
    expect(lista[0].reputacao).toMatchObject({ score: expect.any(Number), faixa: expect.any(String) });
  });
});
