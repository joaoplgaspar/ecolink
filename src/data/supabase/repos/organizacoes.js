// Organização parceira: nesta etapa, só a LEITURA do próprio cadastro (o painel
// mostra o selo "parceiro verificado"). Cadastro, documentos e análise pela
// plataforma chegam na próxima etapa da migração (respondem 501).
export * from 'fonte:nao-migrado/organizacoes';

import {
  TIPOS_ORGANIZACAO,
  documentosExigidos,
  problemasDaOrganizacao,
  organizacaoCompleta,
} from '../../../domain/organizacoes';
import { supabase, consultar, meuId } from '../cliente';

function paraTela(linha) {
  const o = { documentos: [], ...linha };
  return {
    ...o,
    problemas: problemasDaOrganizacao(o),
    completa: organizacaoCompleta(o),
    exigidos: TIPOS_ORGANIZACAO[o.tipo] ? documentosExigidos(o.tipo) : {},
    editavel: false, // edição: próxima etapa (no modo local: rascunho ou reprovada)
  };
}

export async function minha() {
  const id = await meuId();
  const o = await consultar(supabase().from('organizacoes').select('*').eq('responsavel_id', id).maybeSingle());
  return o ? paraTela(o) : null;
}
