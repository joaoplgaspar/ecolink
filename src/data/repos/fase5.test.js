// Fase 5: denúncias, moderação com sanção proporcional, recurso por outra pessoa,
// suspensão preventiva, bloqueios, contestação de pesagem e visão geral.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  denuncias,
  moderacao,
  bloqueios,
  coletas,
  pontos,
  avaliacoes,
  chat,
  parceiro,
  reputacao,
  notificacoes,
  extrato,
  manutencao,
} from './index';
import { ler, transacao } from '../storage';
import { prepararBanco, restaurarRelogio, entrarComo, erroDe, IDS, primeiraJanela, AGORA } from '@/test/ambiente';

const ID = { ...IDS, carla: 3, diego: 4, elisa: 5, gabriela: 7, isabela: 9, sergio: 15 };
const DESC = 'Pediram dinheiro para receber o material, disseram que era taxa da balança.';

beforeEach(() => prepararBanco());
afterEach(restaurarRelogio);

async function denunciarPonto(usuarioId, pontoId, categoria = 'cobranca_indevida') {
  await entrarComo(usuarioId);
  return denuncias.criar({ alvo_tipo: 'ponto', alvo_id: pontoId, categoria, descricao: DESC });
}

async function decidirComo(moderadorId, id, dados) {
  await entrarComo(moderadorId, 'admin');
  return moderacao.decidir(id, { justificativa: 'Relatos consistentes e histórico confirmam a violação.', ...dados });
}

const visivel = async (pontoId) => (await pontos.listar()).some((p) => p.id === pontoId);

describe('denunciar', () => {
  it('gera protocolo e prazo visível (alta = 12 h) e avisa a moderação', async () => {
    const r = await denunciarPonto(ID.ana, 2);
    expect(r.protocolo).toMatch(/^DEN-[A-Z2-9]{5}$/);
    expect(Date.parse(r.prazo) - AGORA.getTime()).toBe(12 * 3600_000);
    const minha = (await denuncias.minhas())[0];
    expect(minha).toMatchObject({
      protocolo: r.protocolo,
      status: 'aberta',
      status_rotulo: 'Recebida',
      gravidade: 'alta',
    });
    await entrarComo(ID.moderacao, 'admin');
    expect((await notificacoes.listar())[0].texto).toMatch(/Nova denúncia GRAVE/);
    expect(ler().auditoria.at(-1)).toMatchObject({ acao: 'denuncia.criada' });
  });

  it('anti-abuso: sem duplicada aberta, sem denunciar o próprio ponto, limite diário', async () => {
    await denunciarPonto(ID.ana, 2);
    expect(await erroDe(denunciarPonto(ID.ana, 2))).toMatchObject({ status: 409, message: /já denunciou/ });

    await entrarComo(ID.marcos, 'parceiro');
    expect(
      await erroDe(denuncias.criar({ alvo_tipo: 'ponto', alvo_id: 1, categoria: 'comportamento', descricao: DESC })),
    ).toMatchObject({ status: 409, message: /ponto em que trabalha/ });

    await entrarComo(ID.bruno);
    for (const id of [3, 5, 6, 7, 8])
      await denuncias.criar({ alvo_tipo: 'ponto', alvo_id: id, categoria: 'outro', descricao: DESC });
    expect(
      await erroDe(denuncias.criar({ alvo_tipo: 'ponto', alvo_id: 9, categoria: 'outro', descricao: DESC })),
    ).toMatchObject({ status: 429 });
  });

  it('só a equipe do ponto da entrega denuncia o cidadão; cidadão comum não', async () => {
    const c = ler().coletas.find((x) => x.usuario_id === ID.diego && x.ponto_id === 1);
    await entrarComo(ID.ana);
    expect(
      await erroDe(
        denuncias.criar({
          alvo_tipo: 'cidadao',
          alvo_id: ID.diego,
          coleta_id: c.id,
          categoria: 'assedio',
          descricao: DESC,
        }),
      ),
    ).toMatchObject({ status: 403 });
    await entrarComo(ID.paula, 'parceiro'); // Paula trabalha no ponto 2, não no 1
    expect(
      await erroDe(
        denuncias.criar({
          alvo_tipo: 'cidadao',
          alvo_id: ID.diego,
          coleta_id: c.id,
          categoria: 'assedio',
          descricao: DESC,
        }),
      ),
    ).toMatchObject({ status: 403 });
  });

  it('valida a descrição e a categoria do tipo de alvo', async () => {
    await entrarComo(ID.ana);
    expect(
      await erroDe(
        denuncias.criar({ alvo_tipo: 'ponto', alvo_id: 2, categoria: 'cobranca_indevida', descricao: 'curta' }),
      ),
    ).toMatchObject({ status: 422 });
    expect(
      await erroDe(denuncias.criar({ alvo_tipo: 'ponto', alvo_id: 2, categoria: 'golpe', descricao: DESC })),
    ).toMatchObject({ status: 422 });
  });
});

describe('decisão procedente suspende o ponto (aceite da Fase 5)', () => {
  it('ponto some do mapa, entregas em aberto são canceladas e o cidadão acompanha o protocolo', async () => {
    const abertasAntes = ler().coletas.filter(
      (c) => c.ponto_id === 2 && ['solicitada', 'confirmada'].includes(c.status),
    );
    const { id, protocolo } = await denunciarPonto(ID.ana, 2);
    expect(await visivel(2)).toBe(true);

    await entrarComo(ID.moderacao, 'admin');
    await moderacao.assumir(id);
    await entrarComo(ID.ana);
    expect((await denuncias.minhas())[0].status_rotulo).toBe('Em análise');

    const caso = await (async () => {
      await entrarComo(ID.moderacao, 'admin');
      return moderacao.caso(id);
    })();
    expect(caso.sugestao).toBe('suspensao_7'); // gravidade alta, sem histórico: começa um degrau acima
    expect(caso.autor.nome).toBe('Ana R.'); // a moderação vê quem denunciou
    const r = await decidirComo(ID.moderacao, id, { procedente: true });
    expect(r.sancao).toBe('suspensao_7');

    expect(ler().pontos.find((p) => p.id === 2).status).toBe('suspenso');
    expect(await visivel(2)).toBe(false);
    for (const c of abertasAntes) {
      const depois = ler().coletas.find((x) => x.id === c.id);
      expect(depois).toMatchObject({ status: 'cancelada', cancelada_por: 'moderacao' });
    }

    await entrarComo(ID.ana);
    const minha = (await denuncias.minhas())[0];
    expect(minha).toMatchObject({ protocolo, status: 'procedente', resultado: { procedente: true } });
    expect(minha.resultado.texto).toMatch(/suspensão de 7 dias/);
    expect(minha.eventos.map((e) => e.tipo)).toEqual(['criada', 'em_analise', 'decidida']);
    expect(JSON.stringify(minha)).not.toMatch(/Relatos consistentes/); // justificativa interna não vaza
  });

  it('o gestor vê a decisão e a suspensão, mas nunca quem denunciou', async () => {
    const { id } = await denunciarPonto(ID.ana, 2);
    await decidirComo(ID.moderacao, id, { procedente: true });
    await entrarComo(ID.sergio, 'parceiro');
    const sobre = await denuncias.sobreMim();
    expect(sobre.pontos_suspensos[0]).toMatchObject({ ponto_id: 2, tipo: 'suspensao_7' });
    expect(sobre.decisoes[0]).toMatchObject({ status: 'procedente', pode_recorrer: true });
    const texto = JSON.stringify(sobre);
    expect(texto).not.toMatch(/Ana|autor|"descricao"/);
    expect(ler().emails_demo.at(-1)).toMatchObject({
      para: 'sergio@email.com',
      assunto: expect.stringMatching(/Decisão da moderação/),
    });
  });

  it('banimento só pela administração', async () => {
    const { id } = await denunciarPonto(ID.ana, 2);
    expect(await erroDe(decidirComo(ID.moderacao, id, { procedente: true, sancao: 'banimento' }))).toMatchObject({
      status: 403,
    });
    await decidirComo(ID.admin, id, { procedente: true, sancao: 'banimento' });
    expect(ler().sancoes.at(-1)).toMatchObject({ tipo: 'banimento', fim: null });
    expect(ler().denuncias.find((d) => d.id === id).decisao.fora_da_escala).toBe(true);
  });

  it('justificativa obrigatória e caso de outra pessoa não pode ser decidido', async () => {
    const { id } = await denunciarPonto(ID.ana, 2);
    await entrarComo(ID.moderacao, 'admin');
    await moderacao.assumir(id);
    expect(await erroDe(moderacao.decidir(id, { procedente: false, justificativa: 'curta' }))).toMatchObject({
      status: 422,
    });
    expect(await erroDe(decidirComo(ID.admin, id, { procedente: false }))).toMatchObject({
      status: 409,
      message: /está com Renata/,
    });
  });
});

describe('recurso', () => {
  it('o gestor recorre; quem decidiu não julga o recurso; outra pessoa reverte e o ponto volta', async () => {
    const { id } = await denunciarPonto(ID.ana, 2);
    await decidirComo(ID.moderacao, id, { procedente: true });
    await entrarComo(ID.sergio, 'parceiro');
    expect(await erroDe(denuncias.recorrer(id, 'curto'))).toMatchObject({ status: 422 });
    await denuncias.recorrer(id, 'Temos câmera no balcão e nunca cobramos nada; anexamos o vídeo à moderação.');
    expect(await erroDe(denuncias.recorrer(id, 'Tentando recorrer de novo com outro texto qualquer.'))).toMatchObject({
      status: 409,
    });

    await entrarComo(ID.moderacao, 'admin');
    expect(
      await erroDe(
        moderacao.decidirRecurso(id, { manter: false, justificativa: 'Revendo minha própria decisão agora.' }),
      ),
    ).toMatchObject({ status: 409, message: /outra pessoa/ });

    await entrarComo(ID.admin, 'admin');
    await moderacao.decidirRecurso(id, {
      manter: false,
      justificativa: 'O vídeo mostra o atendimento sem cobrança alguma.',
    });
    expect(ler().pontos.find((p) => p.id === 2).status).toBe('ativo');
    expect(await visivel(2)).toBe(true);
    expect(ler().sancoes.at(-1).revogada_em).not.toBeNull();

    await entrarComo(ID.ana);
    const minha = (await denuncias.minhas())[0];
    expect(minha).toMatchObject({ status: 'improcedente', recurso: { decidido: true } });
    expect(minha.recurso.resultado).toMatch(/revertida/);
  });

  it('quem denunciou recorre de uma decisão improcedente (seed: Gabriela)', async () => {
    await entrarComo(ID.gabriela);
    const d = (await denuncias.minhas()).find((x) => x.status === 'improcedente');
    expect(d.pode_recorrer).toBe(true);
    await denuncias.recorrer(d.id, 'Tenho fotos da balança marcando diferente do comprovante.');
    await entrarComo(ID.moderacao, 'admin');
    expect((await moderacao.fila({ filtro: 'recursos' })).itens[0].id).toBe(d.id);
  });
});

describe('suspensão preventiva', () => {
  it('3 pessoas distintas com denúncia grave tiram o ponto do mapa; improcedente devolve', async () => {
    await denunciarPonto(ID.ana, 5);
    await denunciarPonto(ID.bruno, 5);
    expect(await visivel(5)).toBe(true);
    const { id } = await denunciarPonto(ID.carla, 5, 'ameaca');
    expect(await visivel(5)).toBe(false);
    expect(ler().sancoes.at(-1)).toMatchObject({ alvo_tipo: 'ponto', alvo_id: 5, tipo: 'preventiva' });

    const r = await decidirComo(ID.moderacao, id, { procedente: false });
    expect(r.relacionadas).toBe(2);
    expect(await visivel(5)).toBe(true);
    expect(
      ler()
        .denuncias.filter((d) => d.alvo_id === 5 && d.alvo_tipo === 'ponto')
        .every((d) => d.status === 'improcedente'),
    ).toBe(true);
  });
});

describe('sanção a cidadão', () => {
  it('conta suspensa: entra, mas não agenda, não avalia, não conversa; reputação explica a penalidade', async () => {
    const c = ler().coletas.find((x) => x.usuario_id === ID.diego && x.ponto_id === 1);
    await entrarComo(ID.marcos, 'parceiro');
    const { id } = await denuncias.criar({
      alvo_tipo: 'cidadao',
      alvo_id: ID.diego,
      coleta_id: c.id,
      categoria: 'assedio',
      descricao: 'Gritou com a atendente e fez ameaças quando o vidro sem embalagem foi recusado.',
    });
    await decidirComo(ID.moderacao, id, { procedente: true });

    await entrarComo(ID.diego);
    const janela = await primeiraJanela(4);
    const e = await erroDe(coletas.solicitar({ ponto_id: 4, ...janela, itens: [{ material: 'papel', kg: 1 }] }));
    expect(e).toMatchObject({ status: 403, detalhes: { codigo: 'conta_restrita' } });
    expect(e.message).toMatch(/recorrer/);
    expect(await erroDe(chat.enviar(1, 'Olá'))).toMatchObject({ status: 403 });
    expect((await coletas.minhas()).length).toBeGreaterThan(0); // continua acompanhando o que já existe

    const rep = await reputacao.minha();
    expect(rep.penalidade).toMatchObject({ pontos: 15, detalhe: expect.stringMatching(/procedente/) });
    const sobre = await denuncias.sobreMim();
    expect(sobre.restricao).toMatchObject({ tipo: 'suspensao_7' });
    expect(JSON.stringify(sobre)).not.toMatch(/Marcos|Gritou/);
  });

  it('a sanção vence sozinha no relógio real', async () => {
    const { id } = await denunciarPonto(ID.ana, 2);
    await decidirComo(ID.moderacao, id, { procedente: true });
    vi.setSystemTime(new Date(AGORA.getTime() + 8 * 24 * 3600_000));
    const r = await manutencao.processarPrazos();
    expect(r.sancoes_encerradas).toBe(1);
    expect(ler().pontos.find((p) => p.id === 2).status).toBe('ativo');
  });
});

describe('avaliação removida pela moderação', () => {
  it('sai da página do ponto e da reputação; o autor é avisado e pode recorrer', async () => {
    const a = ler().avaliacoes.find((x) => x.ponto_id === 1 && x.verificada);
    const antes = (await avaliacoes.resumo(1)).total;
    await entrarComo(ID.marcos, 'parceiro');
    const { id } = await denuncias.criar({
      alvo_tipo: 'avaliacao',
      alvo_id: a.id,
      categoria: 'ofensiva',
      descricao: DESC,
    });
    await decidirComo(ID.moderacao, id, { procedente: true });
    expect((await avaliacoes.listar(1)).some((x) => x.id === a.id)).toBe(false);
    expect((await avaliacoes.resumo(1)).total).toBe(antes - 1);
    await entrarComo(a.usuario_id);
    expect((await denuncias.sobreMim()).decisoes[0]).toMatchObject({
      pode_recorrer: true,
      sancao: { tipo: 'remocao_conteudo' },
    });
  });
});

describe('denúncias improcedentes em excesso pesam na reputação de quem denuncia', () => {
  it('a partir da 3ª em 90 dias', async () => {
    const ids = [];
    for (const p of [3, 6, 7]) ids.push((await denunciarPonto(ID.isabela, p, 'outro')).id);
    for (const id of ids) await decidirComo(ID.moderacao, id, { procedente: false });
    await entrarComo(ID.isabela);
    expect((await reputacao.minha()).penalidade).toMatchObject({ pontos: 3 });
  });
});

describe('bloqueios', () => {
  it('o ponto bloqueia o cidadão (mensagem neutra); o cidadão bloqueia o ponto', async () => {
    const c = ler().coletas.find((x) => x.usuario_id === ID.diego && x.ponto_id === 1);
    await entrarComo(ID.marcos, 'parceiro');
    await bloqueios.bloquear({ alvo_tipo: 'usuario', coleta_id: c.id });
    expect((await bloqueios.listar())[0]).toMatchObject({ rotulo: 'Diego S.', ponto_nome: 'EcoPonto Centro' });

    await entrarComo(ID.diego);
    const janela = await primeiraJanela(1);
    const e = await erroDe(coletas.solicitar({ ponto_id: 1, ...janela, itens: [{ material: 'papel', kg: 1 }] }));
    expect(e).toMatchObject({ status: 403 });
    expect(e.message).not.toMatch(/bloque/i);

    await entrarComo(ID.ana);
    const b = await bloqueios.bloquear({ alvo_tipo: 'ponto', alvo_id: 4 });
    const j4 = await primeiraJanela(4);
    expect(
      await erroDe(coletas.solicitar({ ponto_id: 4, ...j4, itens: [{ material: 'papel', kg: 1 }] })),
    ).toMatchObject({
      status: 409,
      message: /Você bloqueou/,
    });
    await bloqueios.desbloquear(b.id);
    expect(await bloqueios.listar()).toEqual([]);
  });
});

describe('contestação de pesagem', () => {
  async function concluirEntregaDoDiego() {
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

  it('cidadão contesta; moderação ajusta e a DIFERENÇA entra no extrato como ajuste', async () => {
    const c = await concluirEntregaDoDiego();
    await entrarComo(ID.diego);
    expect((await coletas.obter(c.id)).pode_contestar).toBe(true);
    const saldoAntes = (await extrato.meu()).saldo;
    await coletas.contestar(c.id, {
      motivo: 'O peso registrado é menor que o real',
      detalhe: 'Pesei em casa e dava mais.',
    });
    expect(
      await erroDe(coletas.contestar(c.id, { motivo: 'Outro motivo', detalhe: 'Tentando de novo aqui.' })),
    ).toMatchObject({
      status: 409,
    });

    await entrarComo(ID.moderacao, 'admin');
    const det = await moderacao.contestacao(c.id);
    expect(det.operador).toMatchObject({ nome: 'Marcos L.' });
    const itens = det.itens.map((i, k) => ({
      material: i.material,
      kg_aferido: k === 0 ? i.kg_aferido + 2 : i.kg_aferido,
      status: 'aprovado',
    }));
    const r = await moderacao.decidirContestacao(c.id, {
      ajustar: true,
      itens,
      justificativa: 'Foto da balança enviada pelo ponto confirma 2 kg a mais.',
    });
    expect(r.diferenca).toBeGreaterThan(0);

    await entrarComo(ID.diego);
    const depois = await coletas.obter(c.id);
    expect(depois).toMatchObject({ status: 'ajustada', contestacao: { resultado: 'ajustada' } });
    expect(depois.comprovante.ajustado).toBe(true);
    const ex = await extrato.meu();
    expect(ex.saldo).toBe(saldoAntes + r.diferenca);
    expect(ex.lancamentos[0]).toMatchObject({ tipo: 'ajuste', valor: r.diferenca });
    // o lançamento original continua lá (livro-caixa)
    expect(ler().extrato.filter((l) => l.referencia_id === c.id && l.tipo === 'credito_coleta')).toHaveLength(1);
  });

  it('manter o resultado volta para concluída; seed já traz uma contestação aberta', async () => {
    await entrarComo(ID.moderacao, 'admin');
    const lista = await moderacao.contestacoes();
    expect(lista.length).toBeGreaterThan(0);
    await moderacao.decidirContestacao(lista[0].id, {
      ajustar: false,
      justificativa: 'Pesagem conferida com foto e sem divergência relevante.',
    });
    expect(ler().coletas.find((x) => x.id === lista[0].id).status).toBe('concluida');
  });
});

describe('visão geral e fila', () => {
  it('fila priorizada (grave e atrasada primeiro) e números da plataforma; cidadão não acessa', async () => {
    await entrarComo(ID.moderacao, 'admin');
    const { itens, contagem } = await moderacao.fila();
    expect(itens[0]).toMatchObject({ protocolo: 'DEN-K7Q2M', gravidade: 'alta', atrasada: true });
    expect(contagem.abertas).toBe(itens.length);
    const v = await moderacao.visaoGeral();
    expect(v.denuncias).toMatchObject({ graves: 1, atrasadas: 1 });
    expect(v.contestacoes_abertas).toBe(1);
    expect(v.pontos.ativos).toBeGreaterThan(0);

    await entrarComo(ID.ana);
    expect(await erroDe(moderacao.visaoGeral())).toMatchObject({ status: 403 });
    expect(await erroDe(moderacao.fila())).toMatchObject({ status: 403 });
  });

  it('caso com relação pessoal (equipe do ponto) não pode ser moderado por essa pessoa', async () => {
    // Renata passa a ser da equipe do ponto 2 para o teste.
    transacao((s) =>
      s.membros.push({ id: 999, ponto_id: 2, usuario_id: ID.moderacao, papel: 'operador', ativo: true }),
    );
    const { id } = await denunciarPonto(ID.ana, 2);
    await entrarComo(ID.moderacao, 'admin');
    expect((await moderacao.caso(id)).conflito).toBe(true);
    expect(await erroDe(moderacao.assumir(id))).toMatchObject({ status: 409 });
  });
});
