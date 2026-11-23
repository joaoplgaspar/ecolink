// DENÚNCIAS, MODERAÇÃO, SANÇÕES, RECURSO e CONTESTAÇÃO DE PESAGEM (ROADMAP §7, §8).
//
// Princípios:
// • Proteção do denunciante: o denunciado nunca sabe quem denunciou.
// • Proporcionalidade: a sanção sugerida segue uma ESCALA pública e considera o
//   histórico do alvo; fugir da sugestão exige justificativa.
// • Contraditório: toda decisão pode ser contestada uma vez, em até 7 dias, e o
//   recurso é decidido por OUTRA pessoa da moderação.
// • Anti-abuso: limite diário de denúncias; denúncias repetidamente
//   improcedentes reduzem a reputação de quem denuncia.

const DIA = 24 * 3600_000;
const HORA = 3600_000;

/* ------------------------------ gravidade ------------------------------ */

export const GRAVIDADES = {
  alta: { rotulo: 'Alta', peso: 3, sla_horas: 12, tom: 'erro' },
  media: { rotulo: 'Média', peso: 2, sla_horas: 48, tom: 'alerta' },
  baixa: { rotulo: 'Baixa', peso: 1, sla_horas: 72, tom: 'neutro' },
};

/* -------------------------- alvos e categorias ------------------------- */

const OUTRO = { chave: 'outro', rotulo: 'Outro motivo', gravidade: 'baixa' };

export const ALVOS = {
  ponto: {
    rotulo: 'Ponto de coleta',
    categorias: [
      { chave: 'cobranca_indevida', rotulo: 'Cobrou taxa ou pediu pagamento', gravidade: 'alta' },
      { chave: 'descarte_irregular', rotulo: 'Descarte irregular do material', gravidade: 'alta' },
      { chave: 'ameaca', rotulo: 'Ameaça ou violência', gravidade: 'alta' },
      { chave: 'endereco_falso', rotulo: 'Não existe ou o endereço é falso', gravidade: 'media' },
      { chave: 'pesagem_suspeita', rotulo: 'Pesagem suspeita', gravidade: 'media' },
      { chave: 'comportamento', rotulo: 'Comportamento inadequado da equipe', gravidade: 'media' },
      OUTRO,
    ],
  },
  cidadao: {
    rotulo: 'Cidadão',
    categorias: [
      { chave: 'material_perigoso', rotulo: 'Material perigoso escondido', gravidade: 'alta' },
      { chave: 'assedio', rotulo: 'Assédio ou ofensa à equipe', gravidade: 'alta' },
      { chave: 'fraude', rotulo: 'Tentativa de fraude', gravidade: 'media' },
      { chave: 'no_show', rotulo: 'Faltas recorrentes', gravidade: 'baixa' },
      OUTRO,
    ],
  },
  avaliacao: {
    rotulo: 'Avaliação',
    categorias: [
      { chave: 'ofensiva', rotulo: 'Conteúdo ofensivo ou discriminatório', gravidade: 'media' },
      { chave: 'falsa', rotulo: 'Relato falso', gravidade: 'media' },
      { chave: 'conflito', rotulo: 'Conflito de interesse (concorrente, funcionário…)', gravidade: 'media' },
      { chave: 'dados_pessoais', rotulo: 'Expõe dados pessoais', gravidade: 'media' },
      OUTRO,
    ],
  },
  mensagem: {
    rotulo: 'Mensagem do chat',
    categorias: [
      { chave: 'golpe', rotulo: 'Golpe: pedido de Pix ou pagamento fora do app', gravidade: 'alta' },
      { chave: 'assedio', rotulo: 'Assédio ou ofensa', gravidade: 'alta' },
      { chave: 'spam', rotulo: 'Spam ou propaganda', gravidade: 'baixa' },
      OUTRO,
    ],
  },
};

export const categoriaDe = (alvoTipo, chave) => ALVOS[alvoTipo]?.categorias.find((c) => c.chave === chave) || null;

/* ------------------------------- status -------------------------------- */

export const STATUS_DENUNCIA = {
  aberta: { rotulo: 'Recebida', tom: 'neutro' },
  em_analise: { rotulo: 'Em análise', tom: 'alerta' },
  procedente: { rotulo: 'Procedente', tom: 'ok', decidida: true },
  improcedente: { rotulo: 'Arquivada (improcedente)', tom: 'neutro', decidida: true },
  em_recurso: { rotulo: 'Em recurso', tom: 'alerta' },
};
export const STATUS_ABERTOS = ['aberta', 'em_analise', 'em_recurso'];

/* ---------------------------- limites e prazos ---------------------------- */

export const LIMITE_DIARIO = 5;
export const DESCRICAO_MIN = 20;
export const DESCRICAO_MAX = 1000;
export const PRAZO_RECURSO_DIAS = 7;
export const PRAZO_CONTESTAR_DIAS = 7;
/** Suspensão preventiva de PONTO: N pessoas distintas com denúncias abertas de gravidade alta. */
export const PREVENTIVA_DENUNCIANTES = 3;

/** Problemas de uma denúncia (lista vazia = válida). */
export function problemasDaDenuncia({ alvo_tipo, categoria, descricao }) {
  const p = [];
  if (!ALVOS[alvo_tipo]) p.push('Escolha o que você quer denunciar.');
  else if (!categoriaDe(alvo_tipo, categoria)) p.push('Escolha o motivo da denúncia.');
  const d = String(descricao ?? '').trim();
  if (d.length < DESCRICAO_MIN) p.push(`Descreva o que aconteceu (pelo menos ${DESCRICAO_MIN} caracteres).`);
  if (d.length > DESCRICAO_MAX) p.push(`A descrição deve ter no máximo ${DESCRICAO_MAX} caracteres.`);
  return p;
}

/** Quantas denúncias a pessoa já fez nas últimas 24 h e se ainda pode fazer outra. */
export function cotaDiaria(denunciasDoAutor, agora = new Date()) {
  const usadas = denunciasDoAutor.filter((d) => agora.getTime() - Date.parse(d.criada_em) < DIA).length;
  return { usadas, restantes: Math.max(0, LIMITE_DIARIO - usadas), limite: LIMITE_DIARIO };
}

/** Prazo de análise (SLA) visível para quem denunciou. */
export const prazoDeAnalise = (denuncia) =>
  new Date(Date.parse(denuncia.criada_em) + GRAVIDADES[denuncia.gravidade].sla_horas * HORA).toISOString();

/**
 * Prioridade na fila: gravidade primeiro, depois quantas pessoas DIFERENTES
 * denunciaram o mesmo alvo, depois a idade. Atrasadas (SLA estourado) sobem.
 */
export function prioridade(denuncia, { denunciantes = 1, agora = new Date() } = {}) {
  const horas = Math.max(0, (agora.getTime() - Date.parse(denuncia.criada_em)) / HORA);
  const atrasada = agora.getTime() > Date.parse(prazoDeAnalise(denuncia));
  const score =
    GRAVIDADES[denuncia.gravidade].peso * 100 +
    Math.min(5, Math.max(0, denunciantes - 1)) * 20 +
    Math.min(72, horas) +
    (atrasada ? 50 : 0);
  return { score: Math.round(score), atrasada, horas: Math.floor(horas) };
}

/** Deve suspender o PONTO preventivamente? (denúncias abertas de gravidade alta de pessoas distintas) */
export function deveSuspenderPreventivamente(denunciasAbertasDoPonto) {
  const autores = new Set(
    denunciasAbertasDoPonto
      .filter((d) => d.gravidade === 'alta' && STATUS_ABERTOS.includes(d.status))
      .map((d) => d.autor_id),
  );
  return autores.size >= PREVENTIVA_DENUNCIANTES;
}

/* ------------------------------- sanções -------------------------------- */

export const SANCOES = {
  advertencia: { rotulo: 'Advertência', dias: 0, restringe: false },
  suspensao_7: { rotulo: 'Suspensão de 7 dias', dias: 7, restringe: true },
  suspensao_30: { rotulo: 'Suspensão de 30 dias', dias: 30, restringe: true },
  banimento: { rotulo: 'Banimento', dias: null, restringe: true, so_admin: true },
  remocao_conteudo: { rotulo: 'Remoção do conteúdo', dias: 0, restringe: false },
  // Automática, só para PONTO: vale até a moderação decidir (não é punição).
  preventiva: { rotulo: 'Suspensão preventiva (até a análise)', dias: null, restringe: true },
};
export const ESCALA = ['advertencia', 'suspensao_7', 'suspensao_30', 'banimento'];

/** Ações que a moderação pode aplicar a cada tipo de alvo. */
export const acoesPara = (alvoTipo) =>
  alvoTipo === 'avaliacao' || alvoTipo === 'mensagem' ? ['remocao_conteudo'] : ESCALA;

/**
 * Sanção sugerida (proporcional): sobe um degrau a cada sanção anterior do mesmo
 * alvo, e gravidade alta começa um degrau acima. Conteúdo é só removido.
 */
export function sugerirSancao({ alvo_tipo, gravidade, anteriores = 0 }) {
  if (acoesPara(alvo_tipo)[0] === 'remocao_conteudo') return 'remocao_conteudo';
  const degrau = Math.min(ESCALA.length - 1, anteriores + (gravidade === 'alta' ? 1 : 0));
  return ESCALA[degrau];
}

/** Fim de uma sanção a partir do início (null = não expira; mesmo valor do início = pontual). */
export function fimDaSancao(tipo, inicio) {
  const s = SANCOES[tipo];
  if (s.dias === null) return null;
  return new Date(Date.parse(inicio) + s.dias * DIA).toISOString();
}

/** A sanção ainda restringe o alvo agora? */
export function sancaoVigente(sancao, agora = new Date()) {
  if (!SANCOES[sancao.tipo]?.restringe || sancao.revogada_em) return false;
  return sancao.fim === null || Date.parse(sancao.fim) > agora.getTime();
}

/* -------------------------------- recurso -------------------------------- */

/**
 * Quem pode recorrer: o DENUNCIANTE de uma decisão improcedente ou o
 * DENUNCIADO de uma decisão procedente — uma vez, em até 7 dias.
 */
export function podeRecorrer(denuncia, papel, agora = new Date()) {
  if (denuncia.recurso) return false;
  if (!STATUS_DENUNCIA[denuncia.status]?.decidida || !denuncia.decidida_em) return false;
  if (agora.getTime() - Date.parse(denuncia.decidida_em) > PRAZO_RECURSO_DIAS * DIA) return false;
  if (papel === 'denunciante') return denuncia.status === 'improcedente';
  if (papel === 'denunciado') return denuncia.status === 'procedente';
  return false;
}

export const recursoAte = (denuncia) =>
  denuncia.decidida_em ? new Date(Date.parse(denuncia.decidida_em) + PRAZO_RECURSO_DIAS * DIA).toISOString() : null;

/* --------------------------- reflexo na reputação --------------------------- */

export const PENALIDADE_PROCEDENTE = 15; // por denúncia procedente contra o cidadão (180 dias)
export const PENALIDADE_IMPROCEDENTE = 3; // por denúncia improcedente feita, a partir da 3ª em 90 dias
const JANELA_PROCEDENTES_DIAS = 180;
const JANELA_IMPROCEDENTES_DIAS = 90;
const IMPROCEDENTES_TOLERADAS = 2;

/** Pontos a descontar da reputação do CIDADÃO por conduta (e a explicação). */
export function penalidadeDeConduta({ procedentesContra = [], improcedentesFeitas = [], agora = new Date() }) {
  const recentes = (lista, dias) =>
    lista.filter((d) => d.decidida_em && agora.getTime() - Date.parse(d.decidida_em) <= dias * DIA);
  const proc = recentes(procedentesContra, JANELA_PROCEDENTES_DIAS).length;
  const improc = recentes(improcedentesFeitas, JANELA_IMPROCEDENTES_DIAS).length;
  const excesso = Math.max(0, improc - IMPROCEDENTES_TOLERADAS);
  const pontos = proc * PENALIDADE_PROCEDENTE + excesso * PENALIDADE_IMPROCEDENTE;
  const partes = [];
  if (proc)
    partes.push(`${proc} denúncia(s) procedente(s) contra você nos últimos 6 meses (−${proc * PENALIDADE_PROCEDENTE})`);
  if (excesso)
    partes.push(
      `${improc} denúncias suas arquivadas em 90 dias (−${excesso * PENALIDADE_IMPROCEDENTE}; as 2 primeiras não contam)`,
    );
  return { pontos, detalhe: partes.join('; ') };
}

/* ------------------------- contestação de pesagem ------------------------- */

export const MOTIVOS_CONTESTACAO = [
  'O peso registrado é menor que o real',
  'Um item foi recusado sem motivo',
  'Faltou registrar um material que entreguei',
  'Outro motivo',
];

/** O cidadão ainda pode contestar a pesagem desta entrega? */
export function podeContestar(coleta, agora = new Date()) {
  if (!['concluida', 'rejeitada'].includes(coleta.status) || !coleta.concluida_em || coleta.contestacao) return false;
  return agora.getTime() - Date.parse(coleta.concluida_em) <= PRAZO_CONTESTAR_DIAS * DIA;
}
