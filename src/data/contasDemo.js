// Contas de demonstração (todas com a mesma senha conhecida, documentada no README).
//
// O hash abaixo foi gerado uma única vez com PBKDF2-SHA256 (600 mil iterações).
// Ele fica fixo porque o seed é síncrono e o hash é assíncrono e caro. Contas
// criadas pelo cadastro recebem sal e hash próprios. Um teste garante que o hash
// corresponde mesmo à SENHA_DEMO.

export const SENHA_DEMO = 'senha123';
export const HASH_SENHA_DEMO =
  'pbkdf2_sha256$600000$KZHWimLozcZE4pW3MK5zrA==$UCmw+uvMy9KTHe1024ST9/4kWS35bc5BaxUMuOnFXGA=';

/** Contas exibidas no painel "Entrar como…" da tela de login, agrupadas por perfil. */
export const CONTAS_DEMO = [
  { email: 'ana@email.com', grupo: 'Cidadãos', descricao: 'Cidadã com histórico completo' },
  { email: 'bruno@email.com', grupo: 'Cidadãos', descricao: 'Cidadão de São Paulo' },
  { email: 'carla@email.com', grupo: 'Cidadãos', descricao: 'Cidadã do Rio de Janeiro' },
  {
    email: 'marcos@email.com',
    grupo: 'Parceiros',
    descricao: 'Gestor do EcoPonto Centro e da Recicla Pinheiros (também é cidadão)',
  },
  { email: 'paula@email.com', grupo: 'Parceiros', descricao: 'Operadora da Coleta Vila Madalena' },
  {
    email: 'lucia@email.com',
    grupo: 'Parceiros',
    descricao: 'Gestora da ReciclaRio (CNPJ alfanumérico); tem um ponto em análise',
  },
  { email: 'rafael@email.com', grupo: 'Parceiros', descricao: 'Organização recém-cadastrada, aguardando aprovação' },
  { email: 'moderacao@ecolink.app', grupo: 'Plataforma', descricao: 'Equipe de moderação' },
  { email: 'admin@ecolink.app', grupo: 'Plataforma', descricao: 'Administração da plataforma' },
];
