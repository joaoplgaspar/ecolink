// Fase 6: chat real dos dois lados (com detector de golpe), equipe com convites,
// estoque/capacidade/destinação com rastreabilidade e relatórios com CSV.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  chat,
  equipe,
  estoque,
  relatorios,
  coletas,
  parceiro,
  notificacoes,
  denuncias,
  moderacao,
  manutencao,
} from './index';
import { ler, transacao } from '../storage';
import { prepararBanco, restaurarRelogio, entrarComo, erroDe, IDS, primeiraJanela, AGORA } from '@/test/ambiente';

const ID = { ...IDS, diego: 4, elisa: 5, joao: 10 };

beforeEach(() => prepararBanco());
afterEach(restaurarRelogio);

/** Conclui a entrega de hoje do Diego no EcoPonto Centro (pesada pelo Marcos). */
async function entregaDoDiego() {
  const c = ler().coletas.find(
    (x) => x.usuario_id === ID.diego && x.status === 'confirmada' && x.data === '2026-11-23',
  );
  await entrarComo(ID.marcos, 'parceiro');
  await parceiro.checkin(c.id, c.codigo_entrega);
  await parceiro.registrarPesagem(
    c.id,
    c.itens.map((i) => ({ material: i.material, kg_aferido: i.kg_declarado, status: 'aprovado' })),
  );
  return ler().coletas.find((x) => x.id === c.id);
}

describe('chat real (D9)', () => {
  it('cidadão escreve, a equipe vê sem o id dele, responde com resposta rápida e o cidadão vê "visto"', async () => {
    await entrarComo(IDS.bruno);
    await chat.enviar(1, 'Posso levar papelão desmontado amanhã?');

    await entrarComo(ID.marcos, 'parceiro');
    const lista = await chat.conversasDoPonto(1);
    const daBruno = lista.find((c) => c.cidadao === 'Bruno V.');
    expect(daBruno.nao_lidas).toBe(2); // a do seed (isopor) + a nova
    expect(JSON.stringify(lista)).not.toMatch(/usuario_id|bruno@/);
    const c = await chat.conversa(daBruno.id);
    expect(c.respostas_rapidas[0]).toBe('Olá, Bruno! Como podemos ajudar?');
    await chat.responder(daBruno.id, c.respostas_rapidas[0]);

    await entrarComo(IDS.bruno);
    const conversa = await chat.comPonto(1);
    expect(conversa.mensagens.at(-1)).toMatchObject({ de: 'ponto', texto: 'Olá, Bruno! Como podemos ajudar?' });
    expect(conversa.mensagens.at(-2)).toMatchObject({ minha: true, vista: true });
    expect(conversa.mensagens.at(-1).autor).toBeUndefined(); // quem respondeu só a equipe vê
    expect((await notificacoes.listar())[0].texto).toMatch(/EcoPonto Centro respondeu/);
  });

  it('várias mensagens seguidas geram UMA notificação não lida para a equipe', async () => {
    await entrarComo(IDS.ana);
    for (const t of ['Oi', 'Tudo bem?', 'Vocês abrem sábado?']) await chat.enviar(4, t);
    await entrarComo(ID.marcos, 'parceiro');
    const doChat = (await notificacoes.listar()).filter((n) => n.tipo === 'chat' && /Ana R\./.test(n.texto) && !n.lida);
    expect(doChat).toHaveLength(1);
  });

  it('detector de golpe: quem recebe vê os alertas; o envio de Pix pela equipe fica auditado', async () => {
    await entrarComo(ID.elisa);
    const c = await chat.comPonto(8);
    expect(c.mensagens.at(-1).alertas).toEqual(['pagamento', 'contato_externo']);

    await entrarComo(ID.marcos, 'parceiro');
    const conv = (await chat.conversasDoPonto(1)).find((x) => x.cidadao === 'Ana R.');
    const m = await chat.responder(conv.id, 'Faz um pix de R$ 3 que eu adianto sua vez');
    expect(m.alertas).toEqual([]); // quem escreveu não recebe o alerta como "aviso"
    expect(ler().auditoria.at(-1)).toMatchObject({ acao: 'chat.alerta', detalhes: { alertas: ['pagamento'] } });
    await entrarComo(IDS.ana);
    expect((await chat.comPonto(1)).mensagens.at(-1).alertas).toEqual(['pagamento']);
  });

  it('com o ponto fechado, uma resposta automática de ausência (no máximo 1 a cada 12 h)', async () => {
    vi.setSystemTime(new Date('2026-11-23T21:00:00'));
    await entrarComo(IDS.ana);
    await chat.enviar(1, 'Boa noite!');
    await chat.enviar(1, 'Amanhã cedo estão abertos?');
    const autos = (await chat.comPonto(1)).mensagens.filter((m) => m.automatica);
    expect(autos).toHaveLength(1);
    expect(autos[0].texto).toMatch(/Recebemos sua mensagem! .*Seg–Sex/);
  });

  it('só a equipe do ponto lê e responde; cidadão não acessa o painel; anti-spam', async () => {
    await entrarComo(ID.marcos, 'parceiro');
    const conv = (await chat.conversasDoPonto(1))[0];
    await entrarComo(IDS.paula, 'parceiro'); // ponto 2
    expect(await erroDe(chat.conversa(conv.id))).toMatchObject({ status: 403 });
    await entrarComo(IDS.ana);
    expect(await erroDe(chat.conversasDoPonto(1))).toMatchObject({ status: 403 });
    for (let i = 0; i < 30; i++) await chat.enviar(2, `mensagem ${i}`);
    expect(await erroDe(chat.enviar(2, 'mais uma'))).toMatchObject({ status: 429 });
  });

  it('a equipe denuncia uma mensagem do cidadão; procedente remove a mensagem e o autor é avisado', async () => {
    await entrarComo(IDS.bruno);
    await chat.enviar(1, 'Vocês são uns incompetentes, vou acabar com esse ponto');
    await entrarComo(ID.marcos, 'parceiro');
    const conv = (await chat.conversasDoPonto(1)).find((x) => x.cidadao === 'Bruno V.');
    const msg = (await chat.conversa(conv.id)).mensagens.at(-1);
    const { id } = await denuncias.criar({
      alvo_tipo: 'mensagem',
      alvo_id: msg.id,
      categoria: 'assedio',
      descricao: 'Ameaça à equipe depois de termos recusado material sujo na semana passada.',
    });
    await entrarComo(IDS.moderacao, 'admin');
    expect((await moderacao.caso(id)).alvo).toMatchObject({
      tipo: 'cidadao',
      mensagem: expect.stringMatching(/incompetentes/),
    });
    await moderacao.decidir(id, { procedente: true, justificativa: 'Ameaça explícita registrada na conversa.' });
    await entrarComo(IDS.bruno);
    expect((await chat.comPonto(1)).mensagens.at(-1)).toMatchObject({ removida: true });
    expect((await denuncias.sobreMim()).decisoes[0]).toMatchObject({ pode_recorrer: true });
  });

  it('respostas rápidas: só a gestão edita; nada de pedir pagamento', async () => {
    await entrarComo(IDS.paula, 'parceiro');
    expect(
      await erroDe(chat.salvarConfiguracao(2, { respostas_rapidas: ['Oi!'], mensagem_ausencia: 'Já respondemos.' })),
    ).toMatchObject({
      status: 403,
    });
    await entrarComo(ID.marcos, 'parceiro');
    expect(
      await erroDe(
        chat.salvarConfiguracao(1, {
          respostas_rapidas: ['Pix de R$ 2 para agendar'],
          mensagem_ausencia: 'Já voltamos.',
        }),
      ),
    ).toMatchObject({ status: 422 });
    await chat.salvarConfiguracao(1, { respostas_rapidas: ['Olá, {nome}!'], mensagem_ausencia: 'Voltamos {horario}.' });
    expect((await chat.configuracao(1)).respostas_rapidas).toEqual(['Olá, {nome}!']);
  });
});

describe('equipe: convites, papéis e revogação', () => {
  const codigoDoEmail = () =>
    ler()
      .emails_demo.at(-1)
      .corpo.match(/Código do convite: ([A-Z2-9]{8})/)[1];

  it('gestor convida; só o e-mail convidado aceita; vira operador e já conversa pelo ponto', async () => {
    await entrarComo(ID.marcos, 'parceiro');
    await equipe.convidar(1, { email: 'Joao@Email.com', papel: 'operador' });
    const codigo = codigoDoEmail();
    expect(JSON.stringify(ler().convites)).not.toContain(codigo); // só o hash fica guardado

    await entrarComo(IDS.ana);
    expect(await erroDe(equipe.aceitarConvite(codigo))).toMatchObject({ status: 403, message: /outro e-mail/ });
    await entrarComo(ID.joao);
    expect(await equipe.aceitarConvite(codigo.toLowerCase())).toMatchObject({
      ponto_nome: 'EcoPonto Centro',
      papel: 'operador',
    });
    expect(ler().usuarios.find((u) => u.id === ID.joao).papeis).toContain('parceiro_operador');
    expect(await erroDe(equipe.aceitarConvite(codigo))).toMatchObject({ status: 409 }); // uso único

    await entrarComo(ID.joao, 'parceiro');
    expect((await chat.conversasDoPonto(1)).length).toBeGreaterThan(0);
    await entrarComo(ID.marcos, 'parceiro');
    expect((await equipe.doPonto(1)).membros.map((m) => m.nome)).toContain('João Semente');
  });

  it('convite expira em 7 dias; operador não convida; o ponto nunca fica sem gestor', async () => {
    await entrarComo(ID.marcos, 'parceiro');
    await equipe.convidar(1, { email: 'joao@email.com', papel: 'operador' });
    const codigo = codigoDoEmail();
    vi.setSystemTime(new Date(AGORA.getTime() + 8 * 24 * 3600_000));
    await entrarComo(ID.joao);
    expect(await erroDe(equipe.aceitarConvite(codigo))).toMatchObject({ status: 409, message: /expirou/ });

    await entrarComo(IDS.paula, 'parceiro');
    expect(await erroDe(equipe.convidar(2, { email: 'x@y.com', papel: 'operador' }))).toMatchObject({ status: 403 });

    await entrarComo(ID.marcos, 'parceiro');
    const eu = (await equipe.doPonto(1)).membros.find((m) => m.eu);
    expect(await erroDe(equipe.remover(eu.id))).toMatchObject({ status: 409 });
    expect(await erroDe(equipe.alterarPapel(eu.id, 'operador'))).toMatchObject({ status: 409 });
  });

  it('revogar acesso vale na hora', async () => {
    await entrarComo(ID.marcos, 'parceiro');
    await equipe.convidar(1, { email: 'joao@email.com', papel: 'operador' });
    const codigo = codigoDoEmail();
    await entrarComo(ID.joao);
    await equipe.aceitarConvite(codigo);
    await entrarComo(ID.marcos, 'parceiro');
    const joao = (await equipe.doPonto(1)).membros.find((m) => m.nome === 'João Semente');
    await equipe.remover(joao.id);
    await entrarComo(ID.joao, 'parceiro');
    expect(await erroDe(chat.conversasDoPonto(1))).toMatchObject({ status: 403 });
  });
});

describe('estoque, capacidade e destinação (aceite da Fase 6)', () => {
  it('o kg entregue pelo cidadão aparece no estoque do ponto e na destinação final', async () => {
    await entrarComo(ID.marcos, 'parceiro');
    const antes = (await estoque.doPonto(1)).materiais.find((m) => m.material === 'plástico').estoque;
    const c = await entregaDoDiego();
    const kgPlastico = c.itens.find((i) => i.material === 'plástico').kg_aferido;
    const depois = (await estoque.doPonto(1)).materiais.find((m) => m.material === 'plástico');
    expect(depois.estoque).toBeCloseTo(antes + kgPlastico, 5);

    await estoque.registrarDestinacao(1, {
      destino_nome: 'Cooperativa Recicla Juntos',
      destino_tipo: 'cooperativa',
      documento: '37.190.462/0001-29',
      itens: [{ material: 'plástico', kg: depois.estoque }],
      data: '2026-11-23',
    });
    expect((await estoque.doPonto(1)).materiais.find((m) => m.material === 'plástico').estoque).toBe(0);

    await entrarComo(ID.diego);
    const rastreio = (await coletas.obter(c.id)).rastreio.find((r) => r.material === 'plástico');
    expect(rastreio).toMatchObject({ kg: kgPlastico, no_ponto: 0 });
    expect(rastreio.destinos[0]).toMatchObject({ kg: kgPlastico, destino_nome: 'Cooperativa Recicla Juntos' });
    expect((await notificacoes.listar())[0].texto).toMatch(/seguiu para Cooperativa Recicla Juntos/);
  });

  it('não sai mais do que há em estoque; operador também registra destinação', async () => {
    await entrarComo(IDS.paula, 'parceiro');
    const m = (await estoque.doPonto(2)).materiais.find((x) => x.estoque > 0);
    expect(
      await erroDe(
        estoque.registrarDestinacao(2, {
          destino_nome: 'Indústria X',
          destino_tipo: 'industria',
          itens: [{ material: m.material, kg: m.estoque + 5 }],
          data: '2026-11-23',
        }),
      ),
    ).toMatchObject({ status: 422, message: /Só há/ });
    await estoque.registrarDestinacao(2, {
      destino_nome: 'Indústria X',
      destino_tipo: 'industria',
      itens: [{ material: m.material, kg: m.estoque }],
      data: '2026-11-23',
    });
  });

  it('material cheio fica pausado para agendamento; a gestão ajusta a capacidade; 90% avisa a equipe', async () => {
    const vidro = ler().pontos.find((p) => p.id === 4).capacidade_status.vidro;
    expect(vidro).toBe('cheio');
    await entrarComo(IDS.ana);
    const janela = await primeiraJanela(4);
    expect(
      await erroDe(coletas.solicitar({ ponto_id: 4, ...janela, itens: [{ material: 'vidro', kg: 1 }] })),
    ).toMatchObject({ status: 422, message: /está cheio/ });

    await entrarComo(IDS.paula, 'parceiro');
    expect(await erroDe(estoque.definirCapacidade(2, 'papel', 500))).toMatchObject({ status: 403 });
    await entrarComo(ID.marcos, 'parceiro');
    await estoque.definirCapacidade(4, 'vidro', 100);
    expect(ler().pontos.find((p) => p.id === 4).capacidade_status.vidro).toBe('ok');
    await entrarComo(IDS.ana);
    await coletas.solicitar({ ponto_id: 4, ...janela, itens: [{ material: 'vidro', kg: 1 }] });

    // Capacidade apertada no plástico do ponto 1: a pesagem do Diego passa de 90%.
    transacao((s) => {
      const p = s.pontos.find((x) => x.id === 1);
      const est = 10.7; // do seed
      p.regras_materiais.plástico = { ...(p.regras_materiais.plástico || {}), capacidade_kg: Math.ceil(est + 6) };
    });
    await entregaDoDiego();
    expect((await notificacoes.listar()).some((n) => /plástico (em \d+%|cheio)/.test(n.texto))).toBe(true);
  });
});

describe('relatórios e CSV', () => {
  it('números por mês e material; CSV com nome reduzido e sem e-mail; cidadão não acessa', async () => {
    await entrarComo(ID.marcos, 'parceiro');
    const r = await relatorios.doPonto(1);
    expect(r.meses).toHaveLength(6);
    expect(r.totais.kg).toBeGreaterThan(0);
    expect(r.materiais[0]).toHaveProperty('cor');
    const csv = await relatorios.csvEntregas(1);
    expect(csv.split('\r\n')[0]).toBe(
      '﻿Data;Entrega;Situação;Cidadão;Material;Declarado (kg);Pesado (kg);Item;Pesado por',
    );
    expect(csv).toMatch(/Ana R\./);
    expect(csv).not.toMatch(/@email\.com/);
    expect(await relatorios.csvDestinacoes(1)).toMatch(/Cooperativa Recicla Juntos;Cooperativa de reciclagem/);
    await entrarComo(IDS.ana);
    expect(await erroDe(relatorios.doPonto(1))).toMatchObject({ status: 403 });
  });
});

describe('retenção (LGPD)', () => {
  it('mensagens com mais de 1 ano são apagadas pelo relógio', async () => {
    transacao((s) => {
      s.mensagens[0].em = new Date(AGORA.getTime() - 400 * 24 * 3600_000).toISOString();
    });
    const antes = ler().mensagens.length;
    const r = await manutencao.processarPrazos();
    expect(r.mensagens_apagadas).toBe(1);
    expect(ler().mensagens).toHaveLength(antes - 1);
  });
});
