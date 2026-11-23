// Plataforma: usuários, papéis e situação. Só a administração suspende contas;
// a moderação consulta.

import { useState } from 'react';
import { Users, Search, Loader2, Ban, RotateCcw } from 'lucide-react';
import { admin } from '@/data/repos';
import { useQuery } from '@/hooks/useQuery';
import { useMutation } from '@/hooks/useMutation';
import { useAuth } from '@/app/AuthContext.jsx';
import { pode } from '@/domain/permissoes';
import { Carregando, ErroCarregar, MensagemErro, Avatar } from '@/components/ui.jsx';
import { ChipReputacao } from '@/components/Reputacao.jsx';
import { formatDate } from '@/utils/format';
import { useConfirmar, usePedirTexto } from '@/components/Confirmacao.jsx';

export default function Usuarios() {
  const confirmar = useConfirmar();
  const pedirTexto = usePedirTexto();
  const { user, perfil, sessao } = useAuth();
  const [busca, setBusca] = useState('');
  const q = useQuery(() => admin.listarUsuarios({ busca }), [busca]);
  const alterar = useMutation(({ id, status, motivo }) => admin.alterarStatus(id, status, motivo));
  // Mesma regra do repositório, usada aqui só para mostrar/esconder botões.
  const ator = { id: user.id, papeis: user.papeis, perfil, pontos: sessao.pontos };

  async function alternar(u) {
    if (u.status === 'ativo') {
      const motivo = await pedirTexto({
        titulo: `Suspender ${u.nome}?`,
        texto: 'As sessões da conta são encerradas na hora. O motivo fica registrado na auditoria.',
        rotulo: 'Motivo da suspensão',
        minimo: 5,
        acao: 'Suspender conta',
        perigo: true,
      });
      if (!motivo?.trim()) return;
      await alterar.mutate({ id: u.id, status: 'suspenso', motivo });
    } else if (await confirmar({ titulo: `Reativar a conta de ${u.nome}?`, acao: 'Reativar' })) {
      await alterar.mutate({ id: u.id, status: 'ativo' });
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>
          <Users size={24} color="var(--green-600)" /> Usuários
        </h1>
        <p>Contas, papéis e situação. Suspender uma conta encerra as sessões dela na hora.</p>
      </div>

      <div className="card card-pad mb-3">
        <label htmlFor="busca-usuarios" className="sr-only">
          Buscar usuários
        </label>
        <div className="input-icon">
          <Search />
          <input
            id="busca-usuarios"
            className="input"
            placeholder="Buscar por nome ou e-mail…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      <MensagemErro erro={alterar.error} style={{ marginBottom: 12 }} />

      {q.loading ? (
        <Carregando linhas={5} altura={52} />
      ) : !q.data ? (
        <ErroCarregar erro={q.error} onTentar={q.refetch} />
      ) : (
        <div className="card tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Pessoa</th>
                <th>Papéis</th>
                <th className="hide-mobile">Desde</th>
                <th className="hide-mobile">Sessões</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="row" style={{ gap: 10 }}>
                      <Avatar nome={u.nome} size={34} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{u.nome}</div>
                        <div className="small faint">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {u.papeis_rotulos.map((p) => (
                      <span key={p} className="chip-papel">
                        {p}
                      </span>
                    ))}
                    {u.reputacao && (
                      <div className="mt-1">
                        <ChipReputacao resumo={u.reputacao} />
                      </div>
                    )}
                  </td>
                  <td className="hide-mobile small">{formatDate(u.criado_em)}</td>
                  <td className="hide-mobile small">{u.sessoes_ativas}</td>
                  <td>
                    <span className={`chip-papel ${u.status !== 'ativo' ? 'suspenso' : ''}`}>
                      {u.status === 'ativo' ? 'Ativa' : 'Suspensa'}
                    </span>
                    {pode(ator, 'usuario.alterar_status', u) && (
                      <button
                        className={`btn btn-sm ${u.status === 'ativo' ? 'btn-ghost' : ''}`}
                        style={{ marginTop: 4 }}
                        disabled={alterar.pending}
                        onClick={() => alternar(u)}
                        aria-label={u.status === 'ativo' ? `Suspender ${u.nome}` : `Reativar ${u.nome}`}
                      >
                        {alterar.pending ? (
                          <Loader2 size={14} className="spin" />
                        ) : u.status === 'ativo' ? (
                          <Ban size={14} />
                        ) : (
                          <RotateCcw size={14} />
                        )}
                        {u.status === 'ativo' ? 'Suspender' : 'Reativar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
