// Fase 2: cadastro de parceiros, assistente de pontos, aprovações e visibilidade pública.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { organizacoes, parceiro, admin, pontos, coletas, arquivos, auth, notificacoes, demo } from './index';
import { ler, transacao } from '../storage';
import { usarMemoria, lerBlob } from '../arquivos';
import { gradeCom } from '../../domain/horarios';
import { prepararBanco, restaurarRelogio, entrarComo, erroDe, IDS, primeiraJanela } from '@/test/ambiente';

const ID = { ...IDS, sergio: 15, lucia: 16, rafael: 17 };
const PDF = () => new Blob([new TextEncoder().encode('%PDF-1.7\n%conteudo de teste\n')], { type: 'application/pdf' });
const PNG = () =>
  new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0])], {
    type: 'image/png',
  });
const EXE_DISFARCADO = () =>
  new Blob([new TextEncoder().encode('MZ\u0090 isto é um executável')], { type: 'application/pdf' });

beforeEach(() => {
  prepararBanco();
  usarMemoria();
});
afterEach(restaurarRelogio);

/** Cria um cadastro de organização completo para a Ana e devolve o id. */
async function cadastrarOrganizacaoDaAna() {
  await entrarComo(ID.ana);
  await organizacoes.iniciar();
  await organizacoes.salvar({
    tipo: 'cooperativa',
    nome: 'Coop da Ana',
    razao_social: 'Cooperativa da Ana',
    documento: '11.222.333/0001-81',
  });
  await organizacoes.salvar({ responsavel_cargo: 'Presidente', telefone: '(11) 98888-7777' });
  for (const tipo of ['comprovante', 'licenca']) {
    const arq = await arquivos.enviar(PDF(), { nome: `${tipo}.pdf` });
    await organizacoes.adicionarDocumento({ tipo, ...arq });
  }
  return (await organizacoes.minha()).id;
}

const pontoCompletoDados = {
  nome: 'EcoPonto da Ana',
  descricao: 'Ponto comunitário.',
  endereco: 'Rua Nova, 50',
  cidade: 'São Paulo',
  latitude: -23.56,
  longitude: -46.64,
  materiais: ['papel', 'vidro'],
  regras_materiais: { vidro: { condicoes: 'Embrulhado', limite_kg: 10 } },
  horarios: gradeCom(['seg', 'ter', 'qua', 'qui', 'sex'], '08:00', '17:00'),
  excecoes: [],
  regras: { janela_min: 30, capacidade_janela: 4 },
};

describe('cadastro da organização', () => {
  it('iniciar dá o papel de gestor, muda a sessão para Parceiro e não duplica', async () => {
    await entrarComo(ID.ana);
    const o = await organizacoes.iniciar();
    expect(o).toMatchObject({ status: 'rascunho', editavel: true });
    expect((await auth.sessaoAtual()).perfil).toBe('parceiro');
    expect(ler().usuarios.find((u) => u.id === ID.ana).papeis).toEqual(['parceiro_gestor', 'cidadao']);
    expect((await organizacoes.iniciar()).id).toBe(o.id);
    expect(ler().organizacoes.filter((x) => x.responsavel_id === ID.ana)).toHaveLength(1);
  });

  it('salva por etapas, normaliza o CNPJ e corta textos grandes', async () => {
    await entrarComo(ID.ana);
    await organizacoes.iniciar();
    const o = await organizacoes.salvar({ tipo: 'empresa', nome: 'x'.repeat(300), documento: '12.abc.345/01de-35' });
    expect(o.documento).toBe('12ABC34501DE35');
    expect(o.nome).toHaveLength(80); // cortado no limite, nunca gravado maior
    expect(o.problemas.organizacao).toEqual(['Informe a razão social.']); // CNPJ alfanumérico aceito
  });

  it('upload confere a assinatura real: executável disfarçado de PDF é recusado', async () => {
    await entrarComo(ID.ana);
    expect(await erroDe(arquivos.enviar(EXE_DISFARCADO(), { nome: 'licenca.pdf' }))).toMatchObject({ status: 422 });
    const ok = await arquivos.enviar(PDF(), { nome: '../../licenca.pdf' });
    expect(ok).toMatchObject({ mime: 'application/pdf', nome: 'licenca.pdf' });
    expect(await lerBlob(ok.ref)).toBeInstanceOf(Blob);
  });

  it('não envia incompleto; completo vai para análise e trava a edição', async () => {
    await entrarComo(ID.ana);
    await organizacoes.iniciar();
    expect(await erroDe(organizacoes.enviarParaAnalise())).toMatchObject({ status: 422 });
    await cadastrarOrganizacaoDaAna();
    expect((await organizacoes.enviarParaAnalise()).status).toBe('em_analise');
    expect(await erroDe(organizacoes.salvar({ nome: 'Outro' }))).toMatchObject({ status: 409 });
    await entrarComo(ID.admin);
    expect((await notificacoes.listar())[0].texto).toMatch(/Novo parceiro para análise: Coop da Ana/);
  });

  it('documentos são privados: só o responsável e a plataforma abrem', async () => {
    const orgId = await cadastrarOrganizacaoDaAna();
    const docId = (await organizacoes.minha()).documentos[0].id;
    expect((await organizacoes.verDocumento(orgId, docId)).blob).toBeInstanceOf(Blob);
    await entrarComo(ID.bruno);
    expect(await erroDe(organizacoes.verDocumento(orgId, docId))).toMatchObject({ status: 403 });
    await entrarComo(ID.moderacao);
    expect((await organizacoes.verDocumento(orgId, docId)).nome).toBe('comprovante.pdf');
  });

  it('cadastro como parceiro (sem ser cidadão)', async () => {
    const sessao = await auth.cadastrar({
      nome: 'Nova Coop',
      email: 'coop@email.com',
      senha: 'Galpao de reciclagem 1',
      aceitouTermos: true,
      parceiro: true,
    });
    expect(sessao).toMatchObject({
      perfil: 'parceiro',
      perfis: ['parceiro'],
      usuario: { papeis: ['parceiro_gestor'] },
    });
  });
});

describe('aprovação de organizações', () => {
  it('admin aprova; responsável é notificado e por e-mail', async () => {
    const orgId = await cadastrarOrganizacaoDaAna();
    await organizacoes.enviarParaAnalise();
    await entrarComo(ID.admin);
    const fila = await admin.filaAprovacoes();
    const item = fila.organizacoes.find((o) => o.id === orgId);
    expect(item).toMatchObject({ documento_valido: true, responsavel: { nome: 'Ana Recicladora' } });
    await admin.decidirOrganizacao(orgId, { aprovar: true });
    expect(ler().organizacoes.find((o) => o.id === orgId).status).toBe('aprovada');
    expect((await demo.emails())[0]).toMatchObject({ para: 'ana@email.com', assunto: 'Cadastro de parceiro aprovado' });
  });

  it('pedir ajustes exige motivo; parceiro corrige e reenvia', async () => {
    const orgId = await cadastrarOrganizacaoDaAna();
    await organizacoes.enviarParaAnalise();
    await entrarComo(ID.admin);
    expect(await erroDe(admin.decidirOrganizacao(orgId, { aprovar: false, motivo: 'ruim' }))).toMatchObject({
      status: 422,
    });
    await admin.decidirOrganizacao(orgId, { aprovar: false, motivo: 'A licença enviada está vencida.' });
    await entrarComo(ID.ana, 'parceiro');
    const o = await organizacoes.minha();
    expect(o).toMatchObject({ status: 'reprovada', motivo: 'A licença enviada está vencida.', editavel: true });
    await organizacoes.salvar({ sobre: 'Licença renovada.' });
    expect((await organizacoes.enviarParaAnalise()).status).toBe('em_analise');
  });

  it('moderação vê a fila mas não decide; ninguém decide duas vezes', async () => {
    await entrarComo(ID.moderacao);
    const fila = await admin.filaAprovacoes();
    expect(fila.organizacoes.map((o) => o.nome)).toEqual(['Associação Recicla Leste']);
    expect(fila.pontos.map((p) => p.nome)).toEqual(['ReciclaRio Barra']);
    expect(await erroDe(admin.decidirOrganizacao(4, { aprovar: true }))).toMatchObject({ status: 403 });
    await entrarComo(ID.admin);
    await admin.decidirOrganizacao(4, { aprovar: true });
    expect(await erroDe(admin.decidirOrganizacao(4, { aprovar: true }))).toMatchObject({ status: 409 });
  });
});

describe('assistente de ponto', () => {
  it('organização não aprovada não cria ponto', async () => {
    await entrarComo(ID.rafael, 'parceiro'); // organização em análise
    expect(await erroDe(parceiro.novoPonto())).toMatchObject({
      status: 409,
      message: expect.stringMatching(/aprovada/),
    });
  });

  it('fluxo completo: rascunho → análise → aprovado → visível e agendável pelo cidadão', async () => {
    await entrarComo(ID.marcos, 'parceiro');
    const rascunho = await parceiro.novoPonto();
    expect(rascunho).toMatchObject({ status: 'rascunho', completo: false });
    expect(await erroDe(pontos.obter(rascunho.id))).toMatchObject({ status: 404 }); // rascunho não é público

    await parceiro.salvarPonto(rascunho.id, { nome: pontoCompletoDados.nome, descricao: pontoCompletoDados.descricao });
    expect(await erroDe(parceiro.enviarPonto(rascunho.id))).toMatchObject({ status: 422 });
    const completo = await parceiro.salvarPonto(rascunho.id, pontoCompletoDados);
    expect(completo.completo).toBe(true);
    expect((await parceiro.enviarPonto(rascunho.id)).status).toBe('em_analise');
    expect(await erroDe(parceiro.salvarPonto(rascunho.id, { descricao: 'x' }))).toMatchObject({ status: 409 });

    await entrarComo(ID.admin);
    await admin.decidirPonto(rascunho.id, { aprovar: true });

    await entrarComo(ID.ana);
    const publico = await pontos.obter(rascunho.id);
    expect(publico).toMatchObject({
      nome: 'EcoPonto da Ana',
      ativo: true,
      horario: 'Seg–Sex 8h–17h',
      organizacao: { nome: 'Rede EcoCentro', verificada: true },
    });
    expect(publico).not.toHaveProperty('motivo_status');
    expect(
      await coletas.solicitar({
        ponto_id: rascunho.id,
        ...(await primeiraJanela(rascunho.id)),
        itens: [{ material: 'papel', kg: 2 }],
      }),
    ).toMatchObject({ status: 'solicitada' });
  });

  it('depois de aprovado, nome e endereço ficam travados; o operacional pode mudar', async () => {
    await entrarComo(ID.marcos, 'parceiro');
    expect(await erroDe(parceiro.salvarPonto(1, { endereco: 'Outro lugar, 1' }))).toMatchObject({ status: 409 });
    expect(await erroDe(parceiro.salvarPonto(1, { nome: 'Outro nome' }))).toMatchObject({ status: 409 });
    const p = await parceiro.salvarPonto(1, { descricao: 'Nova descrição', materiais: ['papel', 'vidro', 'metal'] });
    expect(p.materiais).toContain('metal');
    expect(await erroDe(parceiro.salvarPonto(1, { materiais: [] }))).toMatchObject({ status: 422 }); // não pode quebrar ponto ativo
  });

  it('só a gestão da organização edita; operadora não edita mas pausa o recebimento', async () => {
    await entrarComo(ID.marcos, 'parceiro');
    expect(await erroDe(parceiro.salvarPonto(2, { descricao: 'x' }))).toMatchObject({ status: 403 }); // ponto de outra organização
    await entrarComo(ID.paula, 'parceiro');
    expect(await erroDe(parceiro.salvarPonto(2, { descricao: 'x' }))).toMatchObject({ status: 403 });
    expect(await parceiro.alterarRecebimento(2, false)).toMatchObject({ status: 'pausado' });
    await entrarComo(ID.ana);
    expect(
      await erroDe(
        coletas.solicitar({
          ponto_id: 2,
          data: '2026-11-24',
          janela_inicio: '09:00',
          itens: [{ material: 'pilhas', kg: 1 }],
        }),
      ),
    ).toMatchObject({ status: 422 });
    expect((await pontos.obter(2)).ativo).toBe(false); // continua visível, mas "não recebendo"
  });

  it('a tela não injeta campos fora da lista (status, organização…)', async () => {
    await entrarComo(ID.marcos, 'parceiro');
    const r = await parceiro.novoPonto();
    const p = await parceiro.salvarPonto(r.id, {
      ...pontoCompletoDados,
      status: 'ativo',
      organizacao_id: 2,
      materiais: ['papel', 'urânio'],
    });
    expect(p).toMatchObject({ status: 'rascunho', organizacao_id: 1, materiais: ['papel'] });
  });

  it('fotos: só imagens; excluir o rascunho apaga os arquivos', async () => {
    await entrarComo(ID.marcos, 'parceiro');
    const r = await parceiro.novoPonto();
    expect(await erroDe(arquivos.enviar(PDF(), { aceitos: ['image/png', 'image/jpeg', 'image/webp'] }))).toMatchObject({
      status: 422,
    });
    const foto = await arquivos.enviar(PNG(), { aceitos: ['image/png'] });
    await parceiro.salvarPonto(r.id, { fotos: [foto] });
    await parceiro.excluirRascunho(r.id);
    expect(await lerBlob(foto.ref)).toBeNull();
    expect(ler().pontos.some((p) => p.id === r.id)).toBe(false);
  });

  it('reprovado volta para edição com o motivo', async () => {
    await entrarComo(ID.admin);
    await admin.decidirPonto(9, { aprovar: false, motivo: 'Faltam fotos da entrada do estacionamento.' });
    await entrarComo(ID.lucia, 'parceiro');
    const p = await parceiro.pontoParaEdicao(9);
    expect(p).toMatchObject({
      status: 'reprovado',
      motivo_status: 'Faltam fotos da entrada do estacionamento.',
      edicao_livre: true,
    });
    expect((await parceiro.enviarPonto(9)).status).toBe('em_analise');
  });
});

describe('visibilidade pública e agendamento', () => {
  it('pontos em análise não aparecem para o cidadão', async () => {
    const lista = await pontos.listar();
    expect(lista.map((p) => p.nome)).not.toContain('ReciclaRio Barra');
    expect(await erroDe(pontos.obter(9))).toMatchObject({ status: 404 });
  });

  it('não agenda em dia fechado (domingo, feriado) e informa o motivo', async () => {
    await entrarComo(ID.ana);
    const base = { ponto_id: 1, janela_inicio: '09:00', itens: [{ material: 'papel', kg: 2 }] };
    expect(await erroDe(coletas.solicitar({ ...base, data: '2026-11-29' }))).toMatchObject({
      status: 422,
      message: expect.stringMatching(/não abre/),
    });
    expect(await erroDe(coletas.solicitar({ ...base, data: '2026-12-25' }))).toMatchObject({
      status: 422,
      message: expect.stringMatching(/não abre/),
    });
  });

  it('respeita o limite de kg por material definido pelo ponto', async () => {
    await entrarComo(ID.ana);
    const janela = await primeiraJanela(1);
    expect(
      await erroDe(coletas.solicitar({ ponto_id: 1, ...janela, itens: [{ material: 'vidro', kg: 31 }] })),
    ).toMatchObject({
      status: 422,
      message: expect.stringMatching(/até 30 kg de vidro/),
    });
  });

  it('a migração v5 não quebra pontos antigos (ponto sem organização)', async () => {
    transacao((s) => {
      s.pontos[0].organizacao_id = null;
    });
    expect((await pontos.obter(1)).organizacao).toBeNull();
  });
});
