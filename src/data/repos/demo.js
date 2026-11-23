// Ferramentas do MODO DEMONSTRAÇÃO (não existiriam em produção).

import { ler, resetar } from '../storage';
import { CONTAS_DEMO, SENHA_DEMO } from '../contasDemo';
import { PAPEIS } from '../../domain/permissoes';
import { limparToken } from '../sessaoCliente';
import { limparTodos } from '../arquivos';
import { chamar } from './_rede';
import { processarPrazos } from './manutencao';

/** Apaga todos os dados do dispositivo e recria o seed de demonstração. */
export function restaurar() {
  return chamar(async () => {
    resetar();
    limparToken();
    await limparTodos(); // fotos e documentos enviados
  });
}

/** Contas para o painel "Entrar como…" (com nome e papéis atuais). */
export function contas() {
  return chamar(() => {
    const usuarios = ler().usuarios;
    return CONTAS_DEMO.map((c) => {
      const u = usuarios.find((x) => x.email === c.email);
      return u ? { ...c, nome: u.nome, papeis: u.papeis.map((p) => PAPEIS[p]?.rotulo || p), status: u.status } : null;
    }).filter(Boolean);
  });
}

export const senhaDemo = SENHA_DEMO;

/**
 * Caixa de e-mail simulada: onde chegam os códigos de recuperação de senha e
 * os avisos de segurança. Num sistema real, isso seria o e-mail da pessoa.
 */
export function emails() {
  return chamar(() => [...ler().emails_demo].reverse());
}

/**
 * Simula a passagem do tempo SÓ para os prazos das entregas (expiração,
 * não comparecimento, lembretes) — para demonstrar sem esperar horas.
 */
export function simularTempo(horas) {
  return processarPrazos({ agora: new Date(Date.now() + Number(horas) * 3600_000) });
}
