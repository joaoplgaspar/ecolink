// Página pública "Seja parceiro": explica o processo e cria a conta de parceiro
// (ou, para quem já tem conta, inicia o cadastro da organização).

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Recycle, Store, ShieldCheck, FileCheck2, MapPinned, Loader2, ArrowRight, UserPlus } from 'lucide-react';
import { useAuth } from '@/app/AuthContext.jsx';
import { organizacoes } from '@/data/repos';
import { mensagemDeErro } from '@/data/erros';
import { MensagemErro } from '@/components/ui.jsx';
import CampoSenha from '@/components/CampoSenha.jsx';
import { problemasDaSenha } from '@/domain/senhas';
import { NOVA_ABA } from '@/utils/ambiente';

const PASSOS = [
  { icone: UserPlus, titulo: 'Crie sua conta', texto: 'Com o e-mail da pessoa responsável pela organização.' },
  {
    icone: FileCheck2,
    titulo: 'Cadastre a organização',
    texto: 'CNPJ (ou CPF, para catador autônomo) e documentos: cartão CNPJ e licença ambiental ou alvará.',
  },
  {
    icone: ShieldCheck,
    titulo: 'Análise da plataforma',
    texto: 'Conferimos os dados e documentos em até 2 dias úteis. Se faltar algo, avisamos o que ajustar.',
  },
  {
    icone: MapPinned,
    titulo: 'Cadastre seus pontos',
    texto: 'Localização no mapa, materiais aceitos, horários. Cada ponto também é revisado antes de aparecer.',
  },
];

export default function SejaParceiro() {
  const { user, register, recarregar } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ nome: '', email: '', senha: '', telefone: '', cidade: '' });
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const set = (c, v) => setForm((f) => ({ ...f, [c]: v }));

  async function comecarComContaExistente() {
    setEnviando(true);
    setErro('');
    try {
      await organizacoes.iniciar();
      await recarregar();
      nav('/parceiro/cadastro');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  async function criarConta(e) {
    e.preventDefault();
    const problemas = problemasDaSenha(form.senha, form);
    if (problemas.length) return setErro(problemas[0]);
    if (!aceitouTermos) return setErro('Para continuar, aceite os Termos de Uso e a Política de Privacidade.');
    setErro('');
    setEnviando(true);
    const r = await register({ ...form, email: form.email.trim(), aceitouTermos, parceiro: true });
    if (!r.ok) {
      setEnviando(false);
      return setErro(r.erro);
    }
    await comecarComContaExistente();
  }

  return (
    <div className="auth-wrap" style={{ alignItems: 'flex-start' }}>
      <div style={{ width: '100%', maxWidth: 980 }}>
        <Link to="/login" className="brand" style={{ marginBottom: 18, display: 'inline-flex' }}>
          <span className="leaf">
            <Recycle size={20} />
          </span>
          <span>ECOLINK</span>
        </Link>
        <div className="grid grid-2" style={{ alignItems: 'start', gap: 20 }}>
          <div>
            <h1 className="row" style={{ gap: 10, fontSize: '1.8rem' }}>
              <Store size={30} color="var(--green-600)" /> Seja um ponto de coleta parceiro
            </h1>
            <p className="muted mt-1">
              Cooperativas, associações, ecopontos públicos, empresas e catadores autônomos: receba recicláveis já
              separados, com agendamento e menos fila.
            </p>
            <ol className="col mt-3" style={{ gap: 14, listStyle: 'none', padding: 0 }}>
              {PASSOS.map((p, i) => (
                <li key={p.titulo} className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                  <span
                    className="iconchip"
                    style={{
                      width: 40,
                      height: 40,
                      background: 'var(--green-100)',
                      color: 'var(--green-700)',
                      flex: 'none',
                    }}
                  >
                    <p.icone size={20} />
                  </span>
                  <div>
                    <strong>
                      {i + 1}. {p.titulo}
                    </strong>
                    <p className="small muted">{p.texto}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="aviso info mt-3">
              <ShieldCheck size={17} style={{ flex: 'none' }} />
              Por que analisamos? Para que o cidadão saiba que o ponto existe, é legal e destina o material
              corretamente. Seus documentos ficam privados: só a equipe de análise vê.
            </div>
          </div>

          <div className="card card-pad">
            {user ? (
              <>
                <h2 style={{ fontSize: '1.15rem' }}>Olá, {user.nome.split(' ')[0]}!</h2>
                <p className="muted small mt-1">
                  Vamos usar sua conta atual ({user.email}) como responsável pela organização.
                </p>
                <MensagemErro erro={erro} style={{ marginTop: 10 }} />
                <button
                  className="btn btn-primary btn-block mt-2"
                  onClick={comecarComContaExistente}
                  disabled={enviando}
                >
                  {enviando ? <Loader2 size={17} className="spin" /> : <ArrowRight size={17} />} Começar o cadastro
                </button>
              </>
            ) : (
              <form onSubmit={criarConta} noValidate>
                <h2 style={{ fontSize: '1.15rem' }} className="mb-2">
                  Criar conta de parceiro
                </h2>
                <div className="field">
                  <label htmlFor="sp-nome">Seu nome (responsável)</label>
                  <input
                    id="sp-nome"
                    className="input"
                    autoComplete="name"
                    maxLength={80}
                    value={form.nome}
                    onChange={(e) => set('nome', e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="sp-email">E-mail</label>
                  <input
                    id="sp-email"
                    className="input"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    required
                  />
                </div>
                <CampoSenha valor={form.senha} aoMudar={(v) => set('senha', v)} nova contexto={form} />
                <div className="grid grid-2" style={{ gap: 12 }}>
                  <div className="field">
                    <label htmlFor="sp-tel">Telefone</label>
                    <input
                      id="sp-tel"
                      className="input"
                      autoComplete="tel"
                      maxLength={20}
                      value={form.telefone}
                      onChange={(e) => set('telefone', e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="sp-cidade">Cidade</label>
                    <input
                      id="sp-cidade"
                      className="input"
                      maxLength={60}
                      value={form.cidade}
                      onChange={(e) => set('cidade', e.target.value)}
                    />
                  </div>
                </div>
                <label className="row small mb-2" style={{ gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={aceitouTermos}
                    onChange={(e) => setAceitouTermos(e.target.checked)}
                    style={{ marginTop: 3 }}
                  />
                  <span>
                    Li e aceito os{' '}
                    <Link to="/termos" {...NOVA_ABA}>
                      Termos de Uso
                    </Link>{' '}
                    e a{' '}
                    <Link to="/privacidade" {...NOVA_ABA}>
                      Política de Privacidade
                    </Link>
                    .
                  </span>
                </label>
                <MensagemErro erro={erro} style={{ marginBottom: 10 }} />
                <button className="btn btn-primary btn-block" type="submit" disabled={enviando}>
                  {enviando ? <Loader2 size={17} className="spin" /> : <UserPlus size={17} />} Criar conta e continuar
                </button>
                <p className="small faint center mt-2">
                  Já tem conta?{' '}
                  <Link to="/login" state={{ de: '/seja-parceiro' }}>
                    Entre
                  </Link>{' '}
                  e volte aqui.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
