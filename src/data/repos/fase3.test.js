// Fase 3: a jornada completa da coleta — solicitar → aceitar → check-in com código
// → pesagem → EcoPontos no extrato — e as regras de segurança de cada passo.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { coletas, parceiro, extrato, estatisticas, resgates, manutencao, demo, notificacoes } from './index';
import { ler } from '../storage';
import { qrDaColeta, qrPessoal } from '../../domain/codigos';
import { prepararBanco, restaurarRelogio, entrarComo, erroDe, IDS, primeiraJanela } from '@/test/ambiente';

const ID = { ...IDS, carla: 3, diego: 4 };
const papel = (kg = 2) => ({ material: 'papel', kg });

beforeEach(() => prepararBanco());
afterEach(restaurarRelogio);

/** A entrega do Diego HOJE no EcoPonto Centro (seed): confirmada, pronta para check-in. */
const entregaDeHoje = () =>
  ler().coletas.find((c) => c.usuario_id === ID.diego && c.status === 'confirmada' && c.data === '2026-11-23');

describe('solicitar entrega (cidadão)', () => {
  it('agenda mostra só janelas livres respeitando a antecedência', async () => {
    const { dias } = await coletas.agenda(1);
    const hoje = dias.find((d) => d.data === '2026-11-23');
    expect(hoje.janelas.find((j) => j.inicio === '13:00')).toMatchObject({
      disponivel: false,
      motivo: 'Antecedência mínima de 2 h',
    });
    expect(hoje.janelas.find((j) => j.inicio === '15:00').disponivel).toBe(true);
    expect(dias.some((d) => d.data === '2026-11-29')).toBe(false); // domingo
  });

  it('cria a solicitação com prazo de resposta, linha do tempo e avisos para os dois lados', async () => {
    await entrarComo(ID.ana);
    const janela = await primeiraJanela(1, { dataMin: '2026-11-24' });
    const c = await coletas.solicitar({
      ponto_id: 1,
      ...janela,
      itens: [papel(3), { material: 'vidro', kg: 2 }],
      usuario_id: ID.bruno,
    });
    expect(c).toMatchObject({
      status: 'solicitada',
      ponto_nome: 'EcoPonto Centro',
      estimativa: 36,
      pode_cancelar: true,
    });
    expect(c).not.toHaveProperty('codigo_entrega');
    const salvo = ler().coletas.find((x) => x.id === c.id);
    expect(salvo.usuario_id).toBe(ID.ana); // o id enviado pela tela é ignorado
    expect(Date.parse(salvo.responder_ate)).toBeGreaterThan(Date.now());
    expect((await coletas.obter(c.id)).eventos.map((e) => e.acao)).toEqual(['solicitar']);
    await entrarComo(ID.marcos, 'parceiro');
    expect((await notificacoes.listar())[0].texto).toMatch(/Nova solicitação de entrega/);
  });

  it.each([
    ['sem itens', { itens: [] }, /pelo menos um material/],
    ['material repetido', { itens: [papel(), papel()] }, /duas vezes/],
    ['material não aceito', { itens: [{ material: 'pilhas', kg: 1 }] }, /não aceita pilhas/],
    ['peso zero', { itens: [papel(0)] }, /quantos kg/],
    ['acima do limite do ponto', { itens: [{ material: 'vidro', kg: 31 }] }, /até 30 kg/],
    ['janela inexistente', { janela_inicio: '03:00' }, /não existe/],
    ['dia fechado', { data: '2026-11-29' }, /não abre/],
    ['em cima da hora', { data: '2026-11-23', janela_inicio: '13:00' }, /Antecedência mínima/],
  ])('recusa %s', async (_, troca, mensagem) => {
    await entrarComo(ID.ana);
    const base = { ponto_id: 1, ...(await primeiraJanela(1, { dataMin: '2026-11-24' })), itens: [papel()] };
    expect(await erroDe(coletas.solicitar({ ...base, ...troca }))).toMatchObject({
      status: 422,
      message: expect.stringMatching(mensagem),
    });
  });

  it('janela lotada não aceita mais ninguém (capacidade do ponto)', async () => {
    const janela = { data: '2026-11-24', janela_inicio: '10:00' };
    for (const id of [ID.ana, ID.bruno, ID.carla]) {
      await entrarComo(id);
      await coletas.solicitar({ ponto_id: 1, ...janela, itens: [papel()] });
    }
    await entrarComo(ID.joao);
    expect(await erroDe(coletas.solicitar({ ponto_id: 1, ...janela, itens: [papel()] }))).toMatchObject({
      status: 422,
      message: expect.stringMatching(/lotou/),
    });
  });

  it(`anti-spam: no máximo ${coletas.MAX_ATIVAS ?? 3} entregas em aberto`, async () => {
    await entrarComo(ID.ana); // já tem 2 em aberto no seed
    await coletas.solicitar({ ponto_id: 1, ...(await primeiraJanela(1, { dataMin: '2026-11-24' })), itens: [papel()] });
    expect(
      await erroDe(coletas.solicitar({ ponto_id: 7, ...(await primeiraJanela(7)), itens: [papel()] })),
    ).toMatchObject({ status: 429 });
  });

  it('ponto com aceite automático confirma na hora e já entrega o código', async () => {
    await entrarComo(ID.joao);
    const c = await coletas.solicitar({
      ponto_id: 7,
      ...(await primeiraJanela(7)),
      itens: [{ material: 'metal', kg: 2 }],
    });
    expect(c.status).toBe('confirmada');
    expect(c.codigo_entrega).toMatch(/^\d{4}$/);
    expect(c.qr).toBe(qrDaColeta(c.codigo, c.codigo_entrega));
  });
});

describe('o cidadão NÃO conclui a própria coleta (D1)', () => {
  it('não existe função para isso no lado do cidadão, e as do ponto recusam', async () => {
    expect(coletas.concluir).toBeUndefined();
    await entrarComo(ID.diego);
    const c = entregaDeHoje();
    expect(await erroDe(parceiro.checkin(c.id, c.codigo_entrega))).toMatchObject({ status: 403 });
    expect(
      await erroDe(
        parceiro.registrarPesagem(c.id, [{ material: c.itens[0].material, kg_aferido: 1, status: 'aprovado' }]),
      ),
    ).toMatchObject({ status: 403 });
  });
});

describe('aceitar e recusar (ponto)', () => {
  it('aceitar gera o código — só o cidadão vê; o ponto nunca', async () => {
    await entrarComo(ID.ana);
    const c = await coletas.solicitar({
      ponto_id: 1,
      ...(await primeiraJanela(1, { dataMin: '2026-11-24' })),
      itens: [papel()],
    });
    await entrarComo(ID.marcos, 'parceiro');
    const aceita = await parceiro.aceitar(c.id);
    expect(aceita.status).toBe('confirmada');
    expect(aceita).not.toHaveProperty('codigo_entrega');
    expect(JSON.stringify(await parceiro.recebimentos(1))).not.toMatch(/codigo_entrega/);
    expect(await erroDe(parceiro.aceitar(c.id))).toMatchObject({ status: 409 }); // não aceita duas vezes
    await entrarComo(ID.ana);
    expect((await coletas.obter(c.id)).codigo_entrega).toMatch(/^\d{4}$/);
  });

  it('recusar exige motivo e avisa o cidadão', async () => {
    const solicitada = ler().coletas.find((c) => c.status === 'solicitada' && c.ponto_id === 1);
    await entrarComo(ID.marcos, 'parceiro');
    expect(await erroDe(parceiro.recusar(solicitada.id, ''))).toMatchObject({ status: 422 });
    expect((await parceiro.recusar(solicitada.id, 'Agenda lotada nesse horário')).status).toBe('recusada');
    await entrarComo(solicitada.usuario_id);
    expect((await notificacoes.listar())[0].texto).toMatch(/Agenda lotada/);
  });

  it('a equipe de outro ponto não opera (403)', async () => {
    await entrarComo(ID.paula, 'parceiro');
    expect(
      await erroDe(parceiro.aceitar(ler().coletas.find((c) => c.status === 'solicitada' && c.ponto_id === 1).id)),
    ).toMatchObject({ status: 403 });
  });
});

describe('check-in com código de entrega', () => {
  it('código certo → em conferência; registra quem fez', async () => {
    const c = entregaDeHoje();
    await entrarComo(ID.marcos, 'parceiro');
    expect((await parceiro.checkin(c.id, c.codigo_entrega)).status).toBe('em_conferencia');
    expect(ler().coletas.find((x) => x.id === c.id)).toMatchObject({
      operador_checkin_id: ID.marcos,
      codigo_entrega: c.codigo_entrega,
    });
  });

  it('código errado é recusado; 5 erros bloqueiam o check-in por 10 minutos', async () => {
    const c = entregaDeHoje();
    const errado = c.codigo_entrega === '0000' ? '1111' : '0000';
    await entrarComo(ID.marcos, 'parceiro');
    for (let i = 0; i < 5; i++) expect(await erroDe(parceiro.checkin(c.id, errado))).toMatchObject({ status: 422 });
    expect(await erroDe(parceiro.checkin(c.id, c.codigo_entrega))).toMatchObject({ status: 429 }); // nem o certo, enquanto bloqueado
    expect(ler().auditoria.filter((a) => a.acao === 'coleta.codigo_incorreto')).toHaveLength(5);
  });

  it('só no dia da entrega', async () => {
    const futura = ler().coletas.find((c) => c.status === 'confirmada' && c.ponto_id === 2 && c.data > '2026-11-23');
    await entrarComo(ID.paula, 'parceiro');
    expect(await erroDe(parceiro.checkin(futura.id, futura.codigo_entrega))).toMatchObject({
      status: 409,
      message: expect.stringMatching(/marcada para/),
    });
  });

  it('QR da coleta faz o check-in direto no balcão', async () => {
    const c = entregaDeHoje();
    await entrarComo(ID.marcos, 'parceiro');
    const r = await parceiro.lerCodigo(1, qrDaColeta(c.codigo, c.codigo_entrega));
    expect(r).toMatchObject({ tipo: 'coleta', coleta: { status: 'em_conferencia' } });
  });
});

describe('pesagem e EcoPontos', () => {
  async function emConferencia() {
    const c = entregaDeHoje();
    await entrarComo(ID.marcos, 'parceiro');
    await parceiro.checkin(c.id, c.codigo_entrega);
    return c;
  }

  it('aprova pelo peso AFERIDO, lança no extrato e emite comprovante para os dois lados', async () => {
    const c = await emConferencia();
    const material = c.itens[0].material;
    const r = await parceiro.registrarPesagem(c.id, [
      { material, kg_aferido: c.itens[0].kg_declarado, status: 'aprovado' },
    ]);
    expect(r.status).toBe('concluida');
    expect(r.comprovante).toMatchObject({ numero: c.codigo, operador: 'Marcos L.', total_kg: c.itens[0].kg_declarado });
    const lancamento = ler().extrato.at(-1);
    expect(lancamento).toMatchObject({
      usuario_id: ID.diego,
      tipo: 'credito_coleta',
      valor: r.pontos_creditados,
      criado_por: ID.marcos,
    });
    expect(
      await erroDe(parceiro.registrarPesagem(c.id, [{ material, kg_aferido: 1, status: 'aprovado' }])),
    ).toMatchObject({ status: 409 }); // não credita duas vezes

    await entrarComo(ID.diego);
    const detalhe = await coletas.obter(c.id);
    expect(detalhe.comprovante.pontos).toBe(r.pontos_creditados);
    expect(detalhe.eventos.map((e) => e.acao)).toEqual(['solicitar', 'aceitar', 'checkin', 'concluir']);
    expect((await extrato.meu()).lancamentos[0].valor).toBe(r.pontos_creditados);
  });

  it('peso muito acima do declarado pede confirmação e fica marcado', async () => {
    const c = await emConferencia();
    const item = { material: c.itens[0].material, kg_aferido: c.itens[0].kg_declarado * 3 + 3, status: 'aprovado' };
    expect(await erroDe(parceiro.registrarPesagem(c.id, [item]))).toMatchObject({
      status: 409,
      detalhes: { codigo: 'divergencia' },
    });
    const r = await parceiro.registrarPesagem(c.id, [item], { confirmarDivergencia: true });
    expect(r.alertas).toContain('divergencia_peso');
  });

  it('aprovação parcial: item recusado não rende pontos; tudo recusado → "material recusado"', async () => {
    const c = await emConferencia();
    const material = c.itens[0].material;
    expect(await erroDe(parceiro.registrarPesagem(c.id, [{ material, status: 'pendente' }]))).toMatchObject({
      status: 422,
    });
    expect(
      await erroDe(parceiro.registrarPesagem(c.id, [{ material, status: 'rejeitado', motivo: '' }])),
    ).toMatchObject({ status: 422 });
    const r = await parceiro.registrarPesagem(c.id, [
      { material, status: 'rejeitado', motivo: 'Material sujo ou contaminado' },
    ]);
    expect(r).toMatchObject({ status: 'rejeitada', pontos_creditados: 0 });
    expect(ler().extrato.some((l) => l.referencia_id === c.id && l.referencia_tipo === 'coleta')).toBe(false);
  });

  it('extrato é a fonte do saldo: resgate debita e a loja confere no extrato', async () => {
    await entrarComo(ID.ana);
    const antes = (await extrato.meu()).saldo;
    expect((await estatisticas.minhas()).saldo).toBe(antes);
    await resgates.resgatar(3);
    const depois = await extrato.meu();
    expect(depois.saldo).toBe(antes - 90);
    expect(depois.lancamentos[0]).toMatchObject({ tipo: 'resgate', valor: -90, tipo_rotulo: 'Resgate na loja' });
  });
});

describe('entrega sem agendamento (código pessoal)', () => {
  it('o ponto lê o QR pessoal, abre a conferência e pesa o que chegou', async () => {
    const { qr } = await (async () => {
      await entrarComo(ID.ana);
      return coletas.meuCodigoPessoal();
    })();
    await entrarComo(ID.marcos, 'parceiro');
    expect(await parceiro.lerCodigo(1, qr)).toMatchObject({ tipo: 'pessoal', cidadao: 'Ana R.' });
    const c = await parceiro.iniciarAvulsa(1, qr);
    expect(c).toMatchObject({ tipo: 'avulsa', status: 'em_conferencia', itens: [] });
    const r = await parceiro.registrarPesagem(c.id, [{ material: 'papel', kg_aferido: 3, status: 'aprovado' }]);
    expect(r).toMatchObject({ status: 'concluida', pontos_creditados: 24 });
  });

  it('ninguém registra a própria entrega (conflito de interesse)', async () => {
    await entrarComo(ID.marcos, 'cidadao');
    const { codigo } = await coletas.meuCodigoPessoal();
    await entrarComo(ID.marcos, 'parceiro');
    expect(await erroDe(parceiro.iniciarAvulsa(1, codigo))).toMatchObject({
      status: 403,
      message: expect.stringMatching(/conflito de interesse/),
    });
  });

  it('renovar o código invalida o anterior', async () => {
    await entrarComo(ID.ana);
    const antigo = (await coletas.meuCodigoPessoal()).codigo;
    const novo = (await coletas.renovarCodigoPessoal()).codigo;
    expect(novo).not.toBe(antigo);
    await entrarComo(ID.marcos, 'parceiro');
    expect(await erroDe(parceiro.iniciarAvulsa(1, qrPessoal(antigo)))).toMatchObject({ status: 404 });
  });
});

describe('cancelamento', () => {
  it('cidadão cancela antes do check-in; o código deixa de valer', async () => {
    const c = entregaDeHoje();
    await entrarComo(ID.diego);
    const r = await coletas.cancelar(c.id);
    expect(r).toMatchObject({ status: 'cancelada', pode_cancelar: false });
    expect(r).not.toHaveProperty('codigo_entrega');
    expect(await erroDe(coletas.cancelar(c.id))).toMatchObject({ status: 409 });
  });

  it('com mais de 2 h de antecedência não é tardio; com menos, fica marcado (reputação, Fase 4)', async () => {
    const c = entregaDeHoje(); // janela às 17h30 de hoje; agora são 12h
    await entrarComo(ID.diego);
    expect((await coletas.obter(c.id)).cancelamento_tardio).toBe(false);
    vi.setSystemTime(new Date('2026-11-23T16:00:00'));
    expect((await coletas.obter(c.id)).cancelamento_tardio).toBe(true); // aviso antes de confirmar
    await coletas.cancelar(c.id);
    expect(ler().coletas.find((x) => x.id === c.id).cancelamento_tardio).toBe(true);
  });

  it('outra pessoa não cancela nem vê (403); a plataforma vê sem o código', async () => {
    const c = entregaDeHoje();
    await entrarComo(ID.ana);
    expect(await erroDe(coletas.cancelar(c.id))).toMatchObject({ status: 403 });
    expect(await erroDe(coletas.obter(c.id))).toMatchObject({ status: 403 });
    await entrarComo(ID.moderacao);
    const visto = await coletas.obter(c.id);
    expect(visto.itens.length).toBeGreaterThan(0);
    expect(visto).not.toHaveProperty('codigo_entrega');
  });

  it('o ponto cancela só com motivo', async () => {
    const c = entregaDeHoje();
    await entrarComo(ID.marcos, 'parceiro');
    expect(await erroDe(parceiro.cancelarPeloPonto(c.id, ''))).toMatchObject({ status: 422 });
    expect((await parceiro.cancelarPeloPonto(c.id, 'Balança quebrada hoje')).status).toBe('cancelada');
  });
});

describe('prazos automáticos (relógio)', () => {
  it('solicitação sem resposta expira; confirmada sem chegada vira "não compareceu"; lembrete sai uma vez', async () => {
    const r1 = await manutencao.processarPrazos({ agora: new Date('2026-11-23T12:00:00') });
    expect(r1.expiradas + r1.nao_compareceu).toBe(0);
    expect(r1.lembretes).toBeGreaterThan(0); // entregas nas próximas 24 h
    expect((await manutencao.processarPrazos({ agora: new Date('2026-11-23T12:00:00') })).lembretes).toBe(0); // idempotente

    const r2 = await demo.simularTempo(48);
    expect(r2.expiradas).toBeGreaterThan(0);
    expect(r2.nao_compareceu).toBeGreaterThan(0);
    const diego = ler().coletas.find((c) => c.usuario_id === ID.diego && c.data === '2026-11-23');
    expect(diego).toMatchObject({ status: 'nao_compareceu', codigo_entrega: null });
    const eventoSistema = ler()
      .coleta_eventos.filter((e) => e.coleta_id === diego.id)
      .at(-1);
    expect(eventoSistema).toMatchObject({ acao: 'marcar_nao_compareceu', ator: 'sistema' });
  });
});
