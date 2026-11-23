// Termos de Uso e Política de Privacidade (texto curto e direto, em linguagem simples).

import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react';
import { TERMOS } from '@/domain/termos';
import { formatDate } from '@/utils/format';

const TEXTOS = {
  termos: {
    titulo: 'Termos de Uso',
    icone: FileText,
    secoes: [
      [
        'O que é o ECOLINK',
        'Uma plataforma que conecta pessoas que querem reciclar a pontos de coleta, com agendamento, acompanhamento e recompensas (EcoPontos).',
      ],
      [
        'Sua conta',
        'Você é responsável pelas informações que cadastra e por manter sua senha em sigilo. Não compartilhe sua conta. Se suspeitar de uso indevido, troque a senha: isso encerra as sessões em outros dispositivos.',
      ],
      [
        'Uso correto',
        'Informe com honestidade o material e a quantidade. Fraudes (como inflar pesos ou criar coletas falsas) levam à suspensão da conta e ao estorno de EcoPontos.',
      ],
      [
        'Pontos de coleta',
        'Parceiros passam por análise antes de aparecer no app e devem seguir as regras de recebimento divulgadas. Você pode avaliá-los e denunciá-los.',
      ],
      [
        'EcoPontos',
        'Não têm valor em dinheiro e só podem ser trocados na loja do app. Podem ser ajustados em caso de erro ou fraude, sempre com registro.',
      ],
      [
        'Moderação',
        'Podemos advertir, suspender ou encerrar contas que violem estes termos, com aviso do motivo e direito a recurso.',
      ],
    ],
  },
  privacidade: {
    titulo: 'Política de Privacidade',
    icone: ShieldCheck,
    secoes: [
      [
        'Quais dados coletamos',
        'Nome, e-mail, telefone (opcional), cidade, suas coletas, avaliações e mensagens. Nada além do necessário para o serviço funcionar.',
      ],
      [
        'Para que usamos',
        'Operar agendamentos e coletas, calcular EcoPontos e impacto ambiental, prevenir fraudes e garantir a segurança da plataforma (LGPD, art. 7º, V e IX).',
      ],
      [
        'O que os pontos de coleta veem',
        'Apenas seu primeiro nome e a inicial do sobrenome, os itens e o horário da entrega. Seu telefone e e-mail nunca são mostrados: o contato é pelo chat do app.',
      ],
      [
        'Segurança',
        'Sua senha é guardada apenas como hash criptográfico (PBKDF2) e ninguém da equipe consegue vê-la. Sessões expiram e ações sensíveis ficam registradas em log de auditoria.',
      ],
      [
        'Seus direitos',
        'Você pode acessar, corrigir, exportar e pedir a exclusão dos seus dados a qualquer momento (LGPD, art. 18).',
      ],
      ['Contato', 'Dúvidas sobre privacidade: privacidade@ecolink.app (endereço ilustrativo do projeto).'],
    ],
  },
};

export default function Documento({ tipo }) {
  const nav = useNavigate();
  const doc = TEXTOS[tipo];
  const Icone = doc.icone;
  return (
    <div className="auth-wrap" style={{ alignItems: 'flex-start' }}>
      <div className="auth-card" style={{ maxWidth: 680 }}>
        <div className="card card-pad">
          <button
            className="btn btn-sm btn-ghost mb-2"
            onClick={() => (window.history.length > 1 ? nav(-1) : nav('/login'))}
          >
            <ArrowLeft size={16} /> Voltar
          </button>
          <h1 className="row" style={{ gap: 8, fontSize: '1.4rem' }}>
            <Icone size={24} color="var(--green-600)" /> {doc.titulo}
          </h1>
          <p className="small faint mt-1">
            Versão {TERMOS.versao} · publicada em {formatDate(TERMOS.publicado_em)} · documento do projeto acadêmico
            ECOLINK
          </p>
          {doc.secoes.map(([titulo, texto]) => (
            <section key={titulo} className="mt-3">
              <h2 style={{ fontSize: '1rem' }}>{titulo}</h2>
              <p className="muted mt-1" style={{ lineHeight: 1.6 }}>
                {texto}
              </p>
            </section>
          ))}
          <p className="small mt-3">
            Veja também:{' '}
            {tipo === 'termos' ? (
              <Link to="/privacidade">Política de Privacidade</Link>
            ) : (
              <Link to="/termos">Termos de Uso</Link>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
