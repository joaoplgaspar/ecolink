// "Denunciar": botão + janela com motivo, relato e anexos. Mostra, ANTES de
// enviar, as garantias de quem denuncia (anonimato para o denunciado, prazo de
// análise) e, depois, o protocolo para acompanhar.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Flag, ShieldCheck, Loader2, CheckCircle2, Paperclip, Trash2, Phone } from 'lucide-react';
import { denuncias, bloqueios } from '@/data/repos';
import { useMutation } from '@/hooks/useMutation';
import { ALVOS, GRAVIDADES, DESCRICAO_MIN, DESCRICAO_MAX, categoriaDe } from '@/domain/denuncias';
import { TIPOS_DOCUMENTO } from '@/domain/arquivos';
import Modal from './Modal.jsx';
import CampoArquivo from './CampoArquivo.jsx';
import { MensagemErro } from './ui.jsx';

const quando = (iso) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/**
 * @param alvo { tipo: 'ponto'|'cidadao'|'avaliacao'|'mensagem', id, coleta_id?, rotulo }
 * @param oferecerBloqueio  cidadão denunciando um ponto pode bloqueá-lo na mesma hora.
 */
export function BotaoDenunciar({
  alvo,
  rotulo = 'Denunciar',
  compacto = false,
  oferecerBloqueio = false,
  className = '',
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        type="button"
        className={`btn btn-ghost ${compacto ? 'btn-sm' : ''} ${className}`}
        onClick={() => setAberto(true)}
        aria-label={`${rotulo}: ${alvo.rotulo}`}
        title={`${rotulo}: ${alvo.rotulo}`}
      >
        <Flag size={compacto ? 14 : 16} /> {rotulo}
      </button>
      {aberto && <DialogoDenuncia alvo={alvo} oferecerBloqueio={oferecerBloqueio} aoFechar={() => setAberto(false)} />}
    </>
  );
}

export function DialogoDenuncia({ alvo, oferecerBloqueio, aoFechar }) {
  const tipo = ALVOS[alvo.tipo];
  const [categoria, setCategoria] = useState('');
  const [descricao, setDescricao] = useState('');
  const [anexos, setAnexos] = useState([]);
  const [bloquear, setBloquear] = useState(false);
  const enviar = useMutation(async () => {
    const r = await denuncias.criar({
      alvo_tipo: alvo.tipo,
      alvo_id: alvo.id,
      coleta_id: alvo.coleta_id ?? null,
      categoria,
      descricao,
      evidencias: anexos,
    });
    if (bloquear) await bloqueios.bloquear({ alvo_tipo: 'ponto', alvo_id: alvo.id });
    return r;
  });
  const [feito, setFeito] = useState(null);

  const cat = categoriaDe(alvo.tipo, categoria);
  const tamanho = descricao.trim().length;
  const pronto = cat && tamanho >= DESCRICAO_MIN && tamanho <= DESCRICAO_MAX;

  async function submeter(e) {
    e.preventDefault();
    const r = await enviar.mutate();
    if (r.ok) setFeito(r.data);
  }

  if (feito) {
    return (
      <Modal titulo="Denúncia enviada" icone={CheckCircle2} aoFechar={aoFechar}>
        <div className="center" style={{ padding: '8px 0' }}>
          <p className="small muted">Protocolo</p>
          <p className="protocolo">{feito.protocolo}</p>
          <p className="small">
            Vamos analisar até <strong>{quando(feito.prazo)}</strong>. Você recebe uma notificação a cada passo.
          </p>
          {bloquear && <p className="small muted mt-1">O ponto também foi bloqueado para você.</p>}
          <div className="row wrap mt-3" style={{ gap: 8, justifyContent: 'center' }}>
            <Link to="/denuncias" className="btn btn-primary btn-sm" onClick={aoFechar}>
              Acompanhar
            </Link>
            <button type="button" className="btn btn-sm" onClick={aoFechar}>
              Fechar
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal titulo={`Denunciar ${tipo.rotulo.toLowerCase()}`} icone={Flag} aoFechar={aoFechar}>
      <form onSubmit={submeter} className="col" style={{ gap: 14 }} noValidate>
        <p className="small muted" style={{ marginTop: -6 }}>
          {alvo.rotulo}
        </p>
        <div className="aviso info">
          <ShieldCheck size={17} style={{ flex: 'none' }} />
          <span>
            Quem for denunciado <strong>não fica sabendo quem denunciou</strong>. Uma pessoa da moderação analisa cada
            caso; denúncias falsas repetidas afetam a reputação de quem as faz.
          </span>
        </div>

        <fieldset className="campo-opcoes">
          <legend className="small" style={{ fontWeight: 700 }}>
            O que aconteceu?
          </legend>
          {tipo.categorias.map((c) => (
            <label key={c.chave} className={`opcao ${categoria === c.chave ? 'ativa' : ''}`}>
              <input
                type="radio"
                name="categoria"
                value={c.chave}
                checked={categoria === c.chave}
                onChange={() => setCategoria(c.chave)}
              />
              <span>{c.rotulo}</span>
              {c.gravidade === 'alta' && <span className="status-ponto erro">prioridade alta</span>}
            </label>
          ))}
        </fieldset>

        {cat?.gravidade === 'alta' && ['ameaca', 'assedio', 'material_perigoso'].includes(categoria) && (
          <div className="aviso erro" role="note">
            <Phone size={16} style={{ flex: 'none' }} />
            <span>
              Se houver perigo agora, ligue <strong>190</strong> (Polícia) ou <strong>193</strong> (Bombeiros). A
              denúncia aqui não substitui o atendimento de emergência.
            </span>
          </div>
        )}

        <label className="col" style={{ gap: 4 }}>
          <span className="small" style={{ fontWeight: 700 }}>
            Conte com detalhes
          </span>
          <textarea
            className="textarea"
            rows={4}
            maxLength={DESCRICAO_MAX}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="O que aconteceu, quando e quem estava presente. Não coloque dados pessoais de terceiros."
            aria-describedby="contador-denuncia"
          />
          <span id="contador-denuncia" className={`small ${tamanho > 0 && tamanho < DESCRICAO_MIN ? '' : 'faint'}`}>
            {tamanho < DESCRICAO_MIN
              ? `Mínimo de ${DESCRICAO_MIN} caracteres (${tamanho}/${DESCRICAO_MIN})`
              : `${tamanho}/${DESCRICAO_MAX}`}
          </span>
        </label>

        <div>
          <span className="small" style={{ fontWeight: 700 }}>
            Provas (opcional)
          </span>
          <p className="small muted">Fotos ou PDF, até 3. Só a moderação vê.</p>
          {anexos.map((a) => (
            <div key={a.ref} className="row small mt-1" style={{ gap: 6 }}>
              <Paperclip size={14} /> {a.nome}
              <button
                type="button"
                className="btn btn-ghost btn-sm icon-btn"
                aria-label={`Remover ${a.nome}`}
                onClick={() => setAnexos((l) => l.filter((x) => x.ref !== a.ref))}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {anexos.length < 3 && (
            <div className="mt-1">
              <CampoArquivo
                rotulo="Anexar prova"
                compacto
                aceitos={TIPOS_DOCUMENTO}
                aoEnviar={(meta) => setAnexos((l) => [...l, meta])}
              />
            </div>
          )}
        </div>

        {oferecerBloqueio && (
          <label className="row small" style={{ gap: 8 }}>
            <input type="checkbox" checked={bloquear} onChange={(e) => setBloquear(e.target.checked)} />
            Também bloquear este ponto para mim (ele some das minhas buscas)
          </label>
        )}

        {cat && <p className="small muted">Prazo de análise: até {GRAVIDADES[cat.gravidade].sla_horas} h.</p>}
        <MensagemErro erro={enviar.error} />
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-danger solido" type="submit" disabled={!pronto || enviar.pending}>
            {enviar.pending && <Loader2 size={15} className="spin" />} Enviar denúncia
          </button>
          <button className="btn btn-ghost" type="button" onClick={aoFechar}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
