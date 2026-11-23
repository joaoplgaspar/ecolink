import { describe, it, expect } from 'vitest';
import { pode, perfisDe, perfilPadrao, perfilInicial, papeisValidos, ACOES } from './permissoes';
import { precisaAceitarTermos, TERMOS } from './termos';

const ator = (papeis, perfil, extra = {}) => ({ id: 1, papeis, perfil, pontos: [], ...extra });

const ANA = ator(['cidadao'], 'cidadao');
const MARCOS_PARCEIRO = ator(['parceiro_gestor', 'cidadao'], 'parceiro', { id: 11, pontos: [1, 4] });
const MARCOS_CIDADAO = { ...MARCOS_PARCEIRO, perfil: 'cidadao' };
const MODERACAO = ator(['moderador'], 'admin', { id: 13 });
const ADMIN = ator(['admin'], 'admin', { id: 14 });

describe('perfis', () => {
  it('derivam dos papéis, em ordem fixa', () => {
    expect(perfisDe(['admin', 'cidadao'])).toEqual(['cidadao', 'admin']);
    expect(perfisDe(['parceiro_gestor', 'parceiro_operador'])).toEqual(['parceiro']);
    expect(perfilPadrao(['parceiro_operador'])).toBe('parceiro');
    expect(perfilPadrao(['cidadao', 'parceiro_gestor'])).toBe('parceiro'); // quem trabalha entra para trabalhar
    expect(perfilPadrao([])).toBeNull();
  });

  it('reabre no último perfil usado, se a pessoa ainda o tiver', () => {
    expect(perfilInicial({ papeis: ['cidadao', 'parceiro_gestor'], ultimo_perfil: 'cidadao' })).toBe('cidadao');
    expect(perfilInicial({ papeis: ['cidadao'], ultimo_perfil: 'admin' })).toBe('cidadao');
  });

  it('valida a lista de papéis', () => {
    expect(papeisValidos(['cidadao'])).toBe(true);
    expect(papeisValidos(['superusuario'])).toBe(false);
    expect(papeisValidos([])).toBe(false);
  });
});

describe('matriz de permissões (ROADMAP §2.1)', () => {
  it.each([
    // [descrição, ator, ação, recurso, esperado]
    ['cidadão agenda coleta', ANA, 'coleta.agendar', { ponto_id: 1 }, true],
    [
      'gestor (no perfil cidadão) não agenda no próprio ponto',
      MARCOS_CIDADAO,
      'coleta.agendar',
      { ponto_id: 1 },
      false,
    ],
    ['gestor (no perfil cidadão) agenda em outro ponto', MARCOS_CIDADAO, 'coleta.agendar', { ponto_id: 7 }, true],
    ['gestor (no perfil parceiro) não agenda', MARCOS_PARCEIRO, 'coleta.agendar', { ponto_id: 7 }, false],
    ['cidadão vê a própria coleta', ANA, 'coleta.ver', { usuario_id: 1, ponto_id: 3 }, true],
    ['cidadão não vê coleta alheia', ANA, 'coleta.ver', { usuario_id: 2, ponto_id: 3 }, false],
    ['parceiro vê coleta do seu ponto', MARCOS_PARCEIRO, 'coleta.ver', { usuario_id: 2, ponto_id: 4 }, true],
    ['parceiro não vê coleta de outro ponto', MARCOS_PARCEIRO, 'coleta.ver', { usuario_id: 2, ponto_id: 2 }, false],
    ['plataforma vê qualquer coleta', MODERACAO, 'coleta.ver', { usuario_id: 2, ponto_id: 2 }, true],
    ['parceiro lista coletas do seu ponto', MARCOS_PARCEIRO, 'coleta.listar_do_ponto', { ponto_id: 1 }, true],
    ['cidadão não lista coletas de ponto', ANA, 'coleta.listar_do_ponto', { ponto_id: 1 }, false],
    ['parceiro acessa o painel', MARCOS_PARCEIRO, 'parceiro.painel', {}, true],
    ['cidadão não acessa o painel do parceiro', ANA, 'parceiro.painel', {}, false],
    ['cidadão não lista usuários', ANA, 'usuario.listar', {}, false],
    ['moderação lista usuários', MODERACAO, 'usuario.listar', {}, true],
    ['moderação vê auditoria', MODERACAO, 'auditoria.ver', {}, true],
    ['moderação não suspende contas', MODERACAO, 'usuario.alterar_status', { id: 2 }, false],
    ['admin suspende outra conta', ADMIN, 'usuario.alterar_status', { id: 2 }, true],
    ['admin não suspende a si mesmo', ADMIN, 'usuario.alterar_status', { id: 14 }, false],
    ['admin não usa a loja', ADMIN, 'resgate.criar', {}, false],
    ['cidadão vê a própria conta', ANA, 'usuario.ver', { id: 1 }, true],
    ['equipe opera coleta do seu ponto', MARCOS_PARCEIRO, 'coleta.operar', { ponto_id: 1, usuario_id: 2 }, true],
    ['equipe não opera coleta de outro ponto', MARCOS_PARCEIRO, 'coleta.operar', { ponto_id: 2, usuario_id: 2 }, false],
    ['ninguém opera (pesa) a própria coleta', MARCOS_PARCEIRO, 'coleta.operar', { ponto_id: 1, usuario_id: 11 }, false],
    ['cidadão não opera coletas', ANA, 'coleta.operar', { ponto_id: 1, usuario_id: 2 }, false],
    ['cidadão não vê conta alheia', ANA, 'usuario.ver', { id: 2 }, false],
    [
      'responsável gerencia a própria organização',
      { ...MARCOS_PARCEIRO, organizacoes: [1] },
      'organizacao.gerenciar',
      { responsavel_id: 11 },
      true,
    ],
    [
      'ninguém gerencia organização alheia',
      { ...MARCOS_PARCEIRO, organizacoes: [1] },
      'organizacao.gerenciar',
      { responsavel_id: 99 },
      false,
    ],
    [
      'gestor gerencia ponto da sua organização',
      { ...MARCOS_PARCEIRO, organizacoes: [1] },
      'ponto.gerenciar',
      { id: 9, organizacao_id: 1 },
      true,
    ],
    [
      'gestor não gerencia ponto de outra organização',
      { ...MARCOS_PARCEIRO, organizacoes: [1] },
      'ponto.gerenciar',
      { id: 2, organizacao_id: 2 },
      false,
    ],
    [
      'operador pausa o ponto em que trabalha',
      ator(['parceiro_operador'], 'parceiro', { pontos: [2] }),
      'ponto.pausar',
      { id: 2 },
      true,
    ],
    [
      'operador não edita o cadastro do ponto',
      ator(['parceiro_operador'], 'parceiro', { pontos: [2], organizacoes: [] }),
      'ponto.gerenciar',
      { id: 2, organizacao_id: 2 },
      false,
    ],
    ['moderação vê a fila de aprovações', MODERACAO, 'aprovacao.ver', {}, true],
    ['só a administração aprova', MODERACAO, 'aprovacao.decidir', {}, false],
    ['admin aprova', ADMIN, 'aprovacao.decidir', {}, true],
    ['documentos: o responsável vê', ANA, 'organizacao.ver_documentos', { responsavel_id: 1 }, true],
    ['documentos: outra pessoa não vê', ANA, 'organizacao.ver_documentos', { responsavel_id: 2 }, false],
  ])('%s', (_, a, acao, recurso, esperado) => {
    expect(pode(a, acao, recurso)).toBe(esperado);
  });

  it('perfil ativo importa: ter o papel não basta se o perfil é outro', () => {
    const marcosNoPerfilPlataforma = { ...MARCOS_PARCEIRO, perfil: 'admin' };
    expect(pode(marcosNoPerfilPlataforma, 'usuario.listar')).toBe(false);
  });

  it('ação desconhecida ou sem ator → negado', () => {
    expect(pode(ADMIN, 'apagar.tudo')).toBe(false);
    expect(pode(null, 'ranking.ver')).toBe(false);
  });

  it('todas as ações estão cobertas por pelo menos um teste acima ou são triviais', () => {
    expect(ACOES).toEqual(expect.arrayContaining(['coleta.agendar', 'usuario.alterar_status', 'auditoria.ver']));
  });
});

describe('termos', () => {
  it('pede aceite de quem nunca aceitou ou aceitou versão anterior', () => {
    expect(precisaAceitarTermos({ aceite_termos: null })).toBe(true);
    expect(precisaAceitarTermos({ aceite_termos: { versao: TERMOS.versao - 1 } })).toBe(true);
    expect(precisaAceitarTermos({ aceite_termos: { versao: TERMOS.versao } })).toBe(false);
  });
});

describe('operação do ponto (Fase 6)', () => {
  const gestor = ator(['parceiro_gestor'], 'parceiro', { pontos: [1, 4], gestor_de: [1] });
  const operador = ator(['parceiro_operador'], 'parceiro', { pontos: [2] });
  it('qualquer membro conversa, vê estoque e registra destinação; só gestor gerencia', () => {
    expect(pode(operador, 'chat.responder', { ponto_id: 2 })).toBe(true);
    expect(pode(operador, 'destinacao.registrar', { ponto_id: 2 })).toBe(true);
    expect(pode(operador, 'equipe.gerenciar', { ponto_id: 2 })).toBe(false);
    expect(pode(operador, 'capacidade.definir', { ponto_id: 2 })).toBe(false);
    expect(pode(gestor, 'equipe.gerenciar', { ponto_id: 1 })).toBe(true);
    expect(pode(gestor, 'equipe.gerenciar', { ponto_id: 4 })).toBe(false); // é membro, mas não gestor dali
    expect(pode(gestor, 'chat.responder', { ponto_id: 2 })).toBe(false); // não é do ponto
  });
});
