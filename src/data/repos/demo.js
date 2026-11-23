// Ferramentas do modo demonstração.

import { resetar } from '../storage';
import { chamar } from './_rede';

/** Apaga todos os dados do dispositivo e recria o seed de demonstração. */
export function restaurar() {
  return chamar(() => {
    resetar();
  });
}
