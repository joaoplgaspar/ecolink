import { describe, it, expect } from 'vitest';
import { analisarMensagem, nivelDosAlertas, preencherResposta, problemasDasRespostas, RESPOSTAS_PADRAO } from './chat';
import {
  entradasDoPonto,
  rastrear,
  estoquePorMaterial,
  situacaoCapacidade,
  cabeNoEstoque,
  problemasDaDestinacao,
} from './estoque';
import { problemasDoConvite, situacaoDoConvite, podeRemoverOuRebaixar } from './equipe';
import { relatorioDoPonto, paraCSV, ultimosMeses } from './relatorios';

const AGORA = new Date('2026-11-23T12:00:00');

describe('detector de golpe no chat', () => {
  it.each([
    ['Faz um Pix de R$ 5 pra liberar a pesagem', ['pagamento']],
    ['Me passa o código de entrega antes de vir?', ['codigo_entrega']],
    ['Entra em bit.ly/promo-eco pra ganhar pontos', ['link']],
    ['Me chama no zap (11) 98765-4321', ['contato_externo']],
    ['Meu CPF é 123.456.789-09', ['dados_sensiveis']],
    ['Vocês aceitam vidro quebrado?', []],
    ['Abrimos às 8h, pode vir!', []],
  ])('"%s" → %j', (texto, esperado) => {
    expect(analisarMensagem(texto)).toEqual(esperado);
  });

  it('nível: pagamento/código/dados = perigo; link/contato = atenção', () => {
    expect(nivelDosAlertas(['link'])).toBe('atencao');
    expect(nivelDosAlertas(['link', 'pagamento'])).toBe('perigo');
    expect(nivelDosAlertas([])).toBeNull();
  });

  it('respostas rápidas: variáveis e validação (não podem pedir pagamento)', () => {
    expect(
      preencherResposta('Olá, {nome}! Abrimos {horario}.', { nome: 'Ana Recicladora', horario: 'Seg–Sex 8h–18h' }),
    ).toBe('Olá, Ana! Abrimos Seg–Sex 8h–18h.');
    expect(problemasDasRespostas(RESPOSTAS_PADRAO)).toEqual([]);
    expect(problemasDasRespostas(['Faça um pix de R$ 2'])).toHaveLength(1);
    expect(problemasDasRespostas(['ok'])).toHaveLength(1);
    expect(problemasDasRespostas(Array(9).fill('Resposta válida'))).toHaveLength(1);
  });
});

describe('estoque e rastreabilidade (FIFO)', () => {
  const coletas = [
    {
      id: 1,
      usuario_id: 10,
      status: 'concluida',
      concluida_em: '2026-11-01T10:00:00Z',
      itens: [{ material: 'papel', kg_aferido: 3, status: 'aprovado' }],
    },
    {
      id: 2,
      usuario_id: 11,
      status: 'concluida',
      concluida_em: '2026-11-05T10:00:00Z',
      itens: [
        { material: 'papel', kg_aferido: 5, status: 'aprovado' },
        { material: 'vidro', kg_aferido: 2, status: 'rejeitado' },
      ],
    },
    { id: 3, usuario_id: 12, status: 'cancelada', itens: [{ material: 'papel', kg_declarado: 9 }] },
    {
      id: 4,
      usuario_id: 10,
      status: 'ajustada',
      concluida_em: '2026-11-10T10:00:00Z',
      itens: [{ material: 'papel', kg_aferido: 2, status: 'aprovado' }],
    },
  ];
  const entradas = entradasDoPonto(coletas);

  it('entradas = só o que foi pesado e aprovado, em ordem de chegada', () => {
    expect(entradas.map((e) => [e.coleta_id, e.kg])).toEqual([
      [1, 3],
      [2, 5],
      [4, 2],
    ]);
  });

  it('cada destinação consome os lotes mais antigos e diz de quais entregas veio', () => {
    const destinacoes = [{ id: 1, data: '2026-11-06', itens: [{ material: 'papel', kg: 6 }] }];
    const { lotes, saidas } = rastrear(entradas, destinacoes);
    expect(saidas[0].origens).toEqual([
      { coleta_id: 1, usuario_id: 10, kg: 3 },
      { coleta_id: 2, usuario_id: 11, kg: 3 },
    ]);
    expect(lotes.find((l) => l.coleta_id === 2)).toMatchObject({
      restante: 2,
      destinos: [{ destinacao_id: 1, kg: 3 }],
    });
    expect(lotes.find((l) => l.coleta_id === 4).destinos).toEqual([]); // chegou depois da destinação
    expect(estoquePorMaterial(entradas, destinacoes).papel).toEqual({ entradas: 10, saidas: 6, estoque: 4 });
  });

  it('capacidade: alerta a partir de 90%, cheio em 100%, reserva o que já está agendado', () => {
    expect(situacaoCapacidade(50, null)).toEqual({ pct: null, status: 'sem_limite' });
    expect(situacaoCapacidade(80, 100).status).toBe('ok');
    expect(situacaoCapacidade(90, 100).status).toBe('alerta');
    expect(situacaoCapacidade(100, 100).status).toBe('cheio');
    expect(cabeNoEstoque({ estoque: 80, reservado: 15, capacidade: 100, kg: 5 })).toEqual({ cabe: true, livre: 5 });
    expect(cabeNoEstoque({ estoque: 80, reservado: 15, capacidade: 100, kg: 6 }).cabe).toBe(false);
  });

  it('valida a destinação contra o estoque e a data', () => {
    const est = { papel: { estoque: 4 } };
    const ok = {
      destino_nome: 'Cooperativa Recicla Juntos',
      destino_tipo: 'cooperativa',
      itens: [{ material: 'papel', kg: 4 }],
      data: '2026-11-20',
    };
    expect(problemasDaDestinacao(ok, est, AGORA)).toEqual([]);
    expect(problemasDaDestinacao({ ...ok, itens: [{ material: 'papel', kg: 5 }] }, est, AGORA)[0]).toMatch(
      /Só há 4 kg/,
    );
    expect(problemasDaDestinacao({ ...ok, data: '2026-12-01' }, est, AGORA)).toHaveLength(1);
    expect(problemasDaDestinacao({ ...ok, destino_tipo: 'lixao' }, est, AGORA)).toHaveLength(1);
    expect(problemasDaDestinacao({ ...ok, documento: '11.111.111/1111-11' }, est, AGORA)).toHaveLength(1);
  });
});

describe('equipe', () => {
  it('convite: e-mail e papel; situação por prazo', () => {
    expect(problemasDoConvite({ email: 'joao@email.com', papel: 'operador' })).toEqual([]);
    expect(problemasDoConvite({ email: 'x', papel: 'dono' })).toHaveLength(2);
    expect(situacaoDoConvite({ expira_em: '2026-11-30T00:00:00Z' }, AGORA)).toBe('pendente');
    expect(situacaoDoConvite({ expira_em: '2026-11-20T00:00:00Z' }, AGORA)).toBe('expirado');
    expect(situacaoDoConvite({ expira_em: '2026-11-30T00:00:00Z', aceito_em: 'x' }, AGORA)).toBe('aceito');
  });

  it('o ponto nunca fica sem gestor', () => {
    const g1 = { ponto_id: 1, papel: 'gestor', ativo: true };
    const op = { ponto_id: 1, papel: 'operador', ativo: true };
    expect(podeRemoverOuRebaixar([g1, op], g1)).toBe(false);
    expect(podeRemoverOuRebaixar([g1, op], g1, 'operador')).toBe(false);
    expect(podeRemoverOuRebaixar([g1, op], op)).toBe(true);
    expect(podeRemoverOuRebaixar([g1, { ...g1 }, op], g1)).toBe(true);
  });
});

describe('relatórios e CSV', () => {
  it('meses com rótulo e virada de ano', () => {
    expect(ultimosMeses(3, new Date('2026-02-10T12:00:00')).map((m) => m.rotulo)).toEqual(['dez', 'jan/26', 'fev']);
  });

  it('kg por mês e material, atendimentos, taxa de faltas e destinação', () => {
    const coletas = [
      {
        id: 1,
        usuario_id: 1,
        data: '2026-11-03',
        status: 'concluida',
        confirmada_em: 'x',
        concluida_em: '2026-11-03T10:00:00Z',
        itens: [{ material: 'papel', kg_aferido: 4, status: 'aprovado' }],
      },
      { id: 2, usuario_id: 2, data: '2026-11-04', status: 'nao_compareceu', confirmada_em: 'x', itens: [] },
      {
        id: 3,
        usuario_id: 1,
        data: '2026-10-10',
        status: 'concluida',
        confirmada_em: 'x',
        concluida_em: '2026-10-10T10:00:00Z',
        itens: [{ material: 'vidro', kg_aferido: 6, status: 'aprovado' }],
      },
    ];
    const r = relatorioDoPonto({
      coletas,
      destinacoes: [{ data: '2026-11-15', itens: [{ material: 'papel', kg: 3 }] }],
      agora: AGORA,
    });
    const nov = r.meses.at(-1);
    expect(nov).toMatchObject({ chave: '2026-11', kg: 4, atendimentos: 1, faltas: 1, destinado_kg: 3 });
    expect(r.totais).toMatchObject({ kg: 10, atendimentos: 2, cidadaos: 1, taxa_faltas: 33 });
    expect(r.materiais[0]).toEqual({ material: 'vidro', kg: 6, pct: 60 });
  });

  it('CSV brasileiro: ";", vírgula decimal, aspas e proteção contra fórmula', () => {
    const csv = paraCSV(
      [{ a: 'Ana; R.', b: 1.5, c: '=HYPERLINK("x")' }],
      [
        { chave: 'a', titulo: 'Nome' },
        { chave: 'b', titulo: 'kg' },
        { chave: 'c', titulo: 'Obs' },
      ],
    );
    expect(csv.startsWith('﻿Nome;kg;Obs\r\n')).toBe(true);
    expect(csv).toContain('"Ana; R.";1,5;"\'=HYPERLINK(""x"")"');
  });
});

describe('rastreabilidade no fuso local', () => {
  it('entrega das 22h (já é o dia seguinte em UTC) entra na destinação do mesmo dia local', () => {
    const noite = new Date('2026-11-20T22:30:00').toISOString(); // local
    const entradas = [{ coleta_id: 9, usuario_id: 1, material: 'papel', kg: 2, em: noite }];
    const { saidas } = rastrear(entradas, [{ id: 1, data: '2026-11-20', itens: [{ material: 'papel', kg: 2 }] }]);
    expect(saidas[0].origens).toEqual([{ coleta_id: 9, usuario_id: 1, kg: 2 }]);
  });
});
