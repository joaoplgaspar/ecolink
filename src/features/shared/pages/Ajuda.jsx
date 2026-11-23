// Ajuda: glossário dos termos do app e perguntas frequentes, para todos os perfis.

import { useState } from 'react';
import { CircleHelp, BookOpen, Sparkles } from 'lucide-react';
import { useAuth } from '@/app/AuthContext.jsx';
import BoasVindas from '@/components/BoasVindas.jsx';

const GLOSSARIO = [
  [
    'EcoPontos',
    'Pontos que você ganha pelo material que o ponto PESA e APROVA. Ficam no extrato e podem ser trocados na loja.',
  ],
  ['Extrato', 'O "livro-caixa" dos seus EcoPontos: cada crédito, resgate e ajuste fica registrado e nada é apagado.'],
  ['Janela', 'O intervalo de horário da sua entrega (ex.: 10h–10h30). Cada janela tem um número limitado de vagas.'],
  [
    'Código de entrega',
    '4 dígitos (e um QR) que só você vê. No balcão, o ponto confere o código — é assim que ninguém se passa por você.',
  ],
  ['Código pessoal', 'Seu QR no perfil, para entregar sem agendamento. Pode ser renovado a qualquer momento.'],
  ['Conferência', 'A pesagem no ponto: cada material é aprovado ou recusado com motivo. Só então os EcoPontos caem.'],
  [
    'Reputação',
    'Nota de 0 a 100 com fórmula pública: comparecimento, peso declarado × balança, material conforme, avaliações e perfil.',
  ],
  [
    'Avaliação verificada',
    'Só quem teve a entrega conferida avalia — uma por entrega. Por isso as notas são confiáveis.',
  ],
  [
    'Destinação',
    'O envio do material do ponto para uma cooperativa ou indústria. Você recebe o aviso de para onde foi o seu.',
  ],
  ['Protocolo', 'O número da sua denúncia (ex.: DEN-K7Q2M), para acompanhar até a decisão.'],
  [
    'Contestação',
    'Pedido de revisão da pesagem, em até 7 dias. A moderação mantém ou ajusta — o ajuste entra no extrato.',
  ],
];

const FAQ = {
  cidadao: [
    [
      'Preciso pagar alguma coisa?',
      'Não. Entregar recicláveis no ECOLINK é sempre gratuito. Se alguém pedir Pix ou pagamento, denuncie a mensagem.',
    ],
    [
      'E se eu não puder ir?',
      'Cancele pela tela da entrega. Com mais de 2 h de antecedência, não afeta sua reputação. Faltas sem avisar pesam.',
    ],
    [
      'Por que recebi menos EcoPontos do que esperava?',
      'Os pontos vêm do peso conferido na balança. Se discordar, use "Contestar pesagem" em até 7 dias.',
    ],
    [
      'O ponto vê meu telefone?',
      'Não. A equipe vê só seu primeiro nome e sua reputação. O contato é sempre pelo chat do app.',
    ],
    [
      'Como apago minha conta?',
      'Em Perfil → Seus dados (LGPD): dá para baixar tudo o que guardamos e excluir a conta.',
    ],
  ],
  parceiro: [
    [
      'Quanto tempo tenho para responder?',
      'O prazo aparece em cada solicitação. Sem resposta, ela expira e a reputação do ponto sente.',
    ],
    [
      'E se a pessoa trouxer material diferente?',
      'Recuse o item na conferência com o motivo — ele não gera EcoPontos. Se houver má-fé, denuncie pelo card da entrega.',
    ],
    [
      'Como adiciono alguém à equipe?',
      'Aba Equipe → convite por e-mail. O código vale 7 dias e só para o e-mail convidado.',
    ],
    [
      'O estoque encheu, e agora?',
      'Em 100% o material sai do agendamento automaticamente. Registre a destinação e ele volta.',
    ],
  ],
  admin: [
    [
      'Posso mudar a medida sugerida?',
      'Pode, com justificativa: fica marcado como "fora da escala" na auditoria. Banimento só pela administração.',
    ],
    [
      'Quem julga o recurso?',
      'Outra pessoa da moderação. O sistema impede que quem decidiu julgue o recurso do próprio caso.',
    ],
  ],
};

export default function Ajuda() {
  const { perfil } = useAuth();
  const [tour, setTour] = useState(false);
  return (
    <div style={{ maxWidth: 820 }}>
      <div className="page-head row between wrap" style={{ gap: 10 }}>
        <div>
          <h1 className="row" style={{ gap: 10 }}>
            <CircleHelp size={24} color="var(--green-600)" /> Ajuda
          </h1>
          <p>Os termos do app e as dúvidas mais comuns.</p>
        </div>
        <button type="button" className="btn" onClick={() => setTour(true)}>
          <Sparkles size={16} /> Ver as boas-vindas de novo
        </button>
      </div>

      <div className="card card-pad mb-3">
        <h2 className="h3 mb-2">Perguntas frequentes</h2>
        <div className="col" style={{ gap: 8 }}>
          {(FAQ[perfil] || FAQ.cidadao).map(([p, r]) => (
            <details key={p} className="faq">
              <summary>{p}</summary>
              <p className="small muted">{r}</p>
            </details>
          ))}
        </div>
      </div>

      <div className="card card-pad">
        <h2 className="h3 row mb-2" style={{ gap: 8 }}>
          <BookOpen size={18} /> Glossário
        </h2>
        <dl className="glossario">
          {GLOSSARIO.map(([termo, def]) => (
            <div key={termo}>
              <dt>{termo}</dt>
              <dd className="small muted">{def}</dd>
            </div>
          ))}
        </dl>
      </div>
      {tour && <BoasVindas perfil={perfil} forcar aoFechar={() => setTour(false)} />}
    </div>
  );
}
