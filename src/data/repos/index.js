// Ponto único de acesso aos dados. As telas importam daqui:
//
//   import { coletas, pontos } from '@/data/repos';
//   const lista = await coletas.listar({ usuario_id: 1 });
//
// Todas as funções são assíncronas (devolvem Promise), como chamadas de API.
// Para trocar o armazenamento local por um back end (ex.: Supabase), basta
// reimplementar estes módulos com as mesmas assinaturas — as telas não mudam.

export * as auth from './auth';
export * as usuarios from './usuarios';
export * as pontos from './pontos';
export * as coletas from './coletas';
export * as avaliacoes from './avaliacoes';
export * as resgates from './resgates';
export * as chat from './chat';
export * as notificacoes from './notificacoes';
export * as estatisticas from './estatisticas';
export * as parceiro from './parceiro';
export * as admin from './admin';
export * as demo from './demo';
