// Plataforma: log de auditoria (quem fez o quê, quando). Nunca contém senhas,
// tokens ou códigos — só a ação, o alvo e detalhes não sensíveis.

import { useState } from 'react';
import { ScrollText } from 'lucide-react';
import { admin } from '@/data/repos';
import { useQuery } from '@/hooks/useQuery';
import { Carregando, ErroCarregar, EmptyState } from '@/components/ui.jsx';

const FILTROS = [
  { chave: '', rotulo: 'Tudo' },
  { chave: 'login', rotulo: 'Login' },
  { chave: 'sessao', rotulo: 'Sessões' },
  { chave: 'senha', rotulo: 'Senha' },
  { chave: 'perfil', rotulo: 'Perfil' },
  { chave: 'usuario', rotulo: 'Moderação' },
  { chave: 'organizacao', rotulo: 'Parceiros' },
  { chave: 'ponto', rotulo: 'Pontos' },
  { chave: 'acesso', rotulo: 'Acessos negados' },
  { chave: 'coleta', rotulo: 'Coletas' },
  { chave: 'resgate', rotulo: 'Loja' },
];

const DESCRICOES = {
  'login.sucesso': 'Entrou',
  'login.falha': 'Errou a senha',
  'login.bloqueado': 'Login bloqueado por excesso de tentativas',
  logout: 'Saiu',
  'conta.criada': 'Criou a conta',
  'perfil.trocado': 'Trocou de perfil',
  'perfil.editado': 'Editou o perfil',
  'sessao.encerrada': 'Encerrou uma sessão',
  'sessao.encerradas_outras': 'Saiu dos outros dispositivos',
  'senha.alterada': 'Alterou a senha',
  'senha.recuperacao_solicitada': 'Pediu código de recuperação',
  'senha.redefinida': 'Redefiniu a senha pelo código',
  'termos.aceitos': 'Aceitou os termos',
  'usuario.suspenso': 'Suspendeu uma conta',
  'usuario.reativado': 'Reativou uma conta',
  'coleta.agendada': 'Agendou coleta',
  'coleta.solicitada': 'Solicitou entrega',
  'coleta.aceita': 'Aceitou entrega',
  'coleta.recusada': 'Recusou entrega',
  'coleta.checkin': 'Check-in com código de entrega',
  'coleta.codigo_incorreto': 'Código de entrega incorreto',
  'coleta.avulsa_iniciada': 'Registrou entrega sem agendamento',
  'coleta.concluida': 'Pesou e concluiu entrega',
  'coleta.rejeitada': 'Recusou o material na conferência',
  'coleta.cancelada': 'Cancelou entrega',
  'coleta.cancelada_pelo_ponto': 'Ponto cancelou entrega',
  'coleta.removida': 'Removeu coleta do histórico',
  'codigo_pessoal.renovado': 'Gerou novo código pessoal',
  'avaliacao.criada': 'Avaliou um ponto',
  'avaliacao.editada': 'Editou avaliação',
  'resgate.criado': 'Resgatou recompensa',
  'acesso.negado': 'Tentou uma ação sem permissão',
  'organizacao.iniciada': 'Iniciou cadastro de parceiro',
  'organizacao.documento_anexado': 'Anexou documento',
  'organizacao.enviada': 'Enviou cadastro para análise',
  'organizacao.aprovada': 'Aprovou parceiro',
  'organizacao.reprovada': 'Pediu ajustes ao parceiro',
  'ponto.criado': 'Criou rascunho de ponto',
  'ponto.editado': 'Editou ponto',
  'ponto.enviado': 'Enviou ponto para análise',
  'ponto.aprovado': 'Aprovou ponto',
  'ponto.reprovado': 'Pediu ajustes no ponto',
  'ponto.pausado': 'Pausou o recebimento',
  'ponto.retomado': 'Retomou o recebimento',
  'ponto.rascunho_excluido': 'Excluiu rascunho de ponto',
};

const quando = (iso) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

export default function Auditoria() {
  const [filtro, setFiltro] = useState('');
  const q = useQuery(() => admin.auditoria({ acao: filtro }), [filtro]);

  return (
    <div>
      <div className="page-head">
        <h1>
          <ScrollText size={24} color="var(--green-600)" /> Auditoria
        </h1>
        <p>Registro das ações sensíveis da plataforma. Senhas, tokens e códigos nunca são registrados.</p>
      </div>

      <div className="row wrap mb-3" style={{ gap: 6 }} role="group" aria-label="Filtrar por tipo">
        {FILTROS.map((f) => (
          <button
            key={f.chave}
            type="button"
            aria-pressed={filtro === f.chave}
            className={`tag clickable ${filtro === f.chave ? 'active' : ''}`}
            onClick={() => setFiltro(f.chave)}
          >
            {f.rotulo}
          </button>
        ))}
      </div>

      {q.loading ? (
        <Carregando linhas={6} altura={40} />
      ) : !q.data ? (
        <ErroCarregar erro={q.error} onTentar={q.refetch} />
      ) : q.data.length === 0 ? (
        <EmptyState icon={ScrollText} title="Nada registrado ainda">
          Entre e saia com algumas contas, ou agende uma coleta, e volte aqui.
        </EmptyState>
      ) : (
        <div className="card tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Quem</th>
                <th>Ação</th>
                <th className="hide-mobile">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((r) => (
                <tr key={r.id}>
                  <td className="small mono">{quando(r.em)}</td>
                  <td className="small">{r.ator_nome}</td>
                  <td className="small">
                    {DESCRICOES[r.acao] || r.acao}
                    {r.recurso_tipo && (
                      <span className="faint">
                        {' '}
                        · {r.recurso_tipo} #{r.recurso_id}
                      </span>
                    )}
                  </td>
                  <td className="hide-mobile small mono faint">{r.detalhes ? JSON.stringify(r.detalhes) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
