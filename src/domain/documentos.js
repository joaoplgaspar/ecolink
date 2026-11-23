// Validação de CNPJ e CPF pelos dígitos verificadores.
//
// CNPJ ALFANUMÉRICO: desde julho de 2026 a Receita Federal emite CNPJs com
// letras nas 12 primeiras posições (IN RFB nº 2.229/2024). O cálculo do dígito
// é o mesmo de sempre, usando o valor de cada caractere = código ASCII − 48
// ('0'→0 … '9'→9, 'A'→17 … 'Z'→42). Os dois últimos dígitos continuam numéricos.
// Exemplo oficial: 12.ABC.345/01DE-35.

const valor = (c) => c.charCodeAt(0) - 48;

function digitoVerificador(base, pesos) {
  const soma = [...base].reduce((t, c, i) => t + valor(c) * pesos[i], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/** Só letras maiúsculas e números (tira pontos, barras, traços e espaços). */
export function limparCNPJ(texto) {
  return String(texto ?? '')
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '');
}

export function validarCNPJ(texto) {
  const c = limparCNPJ(texto);
  if (!/^[0-9A-Z]{12}\d{2}$/.test(c)) return false;
  if (/^(.)\1{13}$/.test(c)) return false; // 00.000.000/0000-00, 11.111.111/1111-11…
  const d1 = digitoVerificador(c.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digitoVerificador(c.slice(0, 12) + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return c.endsWith(`${d1}${d2}`);
}

/** Formata enquanto digita: 12.ABC.345/01DE-35 */
export function formatarCNPJ(texto) {
  const c = limparCNPJ(texto).slice(0, 14);
  return c
    .replace(/^(.{2})(.)/, '$1.$2')
    .replace(/^(.{2})\.(.{3})(.)/, '$1.$2.$3')
    .replace(/^(.{2})\.(.{3})\.(.{3})(.)/, '$1.$2.$3/$4')
    .replace(/^(.{2})\.(.{3})\.(.{3})\/(.{4})(.)/, '$1.$2.$3/$4-$5');
}

export function limparCPF(texto) {
  return String(texto ?? '').replace(/\D/g, '');
}

export function validarCPF(texto) {
  const c = limparCPF(texto);
  if (!/^\d{11}$/.test(c) || /^(\d)\1{10}$/.test(c)) return false;
  const dv = (base) => {
    const soma = [...base].reduce((t, n, i) => t + Number(n) * (base.length + 1 - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const d1 = dv(c.slice(0, 9));
  const d2 = dv(c.slice(0, 9) + d1);
  return c.endsWith(`${d1}${d2}`);
}

/** Formata enquanto digita: 123.456.789-09 */
export function formatarCPF(texto) {
  return limparCPF(texto)
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

/** CNPJ mascarado para exibir a terceiros: 12.ABC.***\/****-35 */
export function mascararCNPJ(texto) {
  const f = formatarCNPJ(texto);
  return f.length === 18 ? `${f.slice(0, 6)}.***/****-${f.slice(-2)}` : f;
}
