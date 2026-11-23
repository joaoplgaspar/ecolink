// Configuração da "API simulada": latência e falhas artificiais.
//
// Por que simular rede? Para que as telas já tratem carregando / erro / vazio
// exatamente como fariam com um back end real — e para poder demonstrar isso.
// Ajuste pelo console do navegador:
//   localStorage.setItem('ecolink:dev', JSON.stringify({ latenciaMin: 0, latenciaMax: 0 }))
//   localStorage.setItem('ecolink:dev', JSON.stringify({ taxaFalha: 0.3 }))  // 30% das chamadas falham

const CHAVE = 'ecolink:dev';

const PADRAO = Object.freeze({ latenciaMin: 120, latenciaMax: 380, taxaFalha: 0 });
const SEM_REDE = Object.freeze({ latenciaMin: 0, latenciaMax: 0, taxaFalha: 0 });

const emTeste = import.meta.env?.MODE === 'test';

function lerSalvo() {
  try {
    const bruto = globalThis.localStorage?.getItem(CHAVE);
    return bruto ? { ...PADRAO, ...JSON.parse(bruto) } : { ...PADRAO };
  } catch {
    return { ...PADRAO };
  }
}

let config = emTeste ? { ...SEM_REDE } : lerSalvo();

export function getConfig() {
  return config;
}

/** Altera a configuração (e persiste no navegador, fora dos testes). */
export function setConfig(parcial) {
  config = { ...config, ...parcial };
  if (!emTeste) {
    try {
      globalThis.localStorage?.setItem(CHAVE, JSON.stringify(config));
    } catch {
      /* sem armazenamento: vale só para esta sessão */
    }
  }
  return config;
}
