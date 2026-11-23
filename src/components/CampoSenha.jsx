// Campo de senha com "mostrar/ocultar" e, para senhas novas, medidor de força
// e as regras da política em tempo real (as mesmas que o repositório aplica).

import { useId, useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { forcaDaSenha, problemasDaSenha, SENHA_MIN } from '@/domain/senhas';

export default function CampoSenha({
  rotulo = 'Senha',
  valor,
  aoMudar,
  nova = false,
  contexto = {},
  autoComplete,
  obrigatorio = true,
  id: idExterno,
}) {
  const idInterno = useId();
  const id = idExterno || idInterno;
  const [visivel, setVisivel] = useState(false);
  const forca = forcaDaSenha(valor);
  const problemas = nova && valor ? problemasDaSenha(valor, contexto) : [];

  return (
    <div className="field">
      <label htmlFor={id}>{rotulo}</label>
      <div className="input-icon" style={{ position: 'relative' }}>
        <Lock />
        <input
          id={id}
          className="input"
          type={visivel ? 'text' : 'password'}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          autoComplete={autoComplete || (nova ? 'new-password' : 'current-password')}
          required={obrigatorio}
          minLength={nova ? SENHA_MIN : undefined}
          maxLength={128}
          aria-describedby={nova ? `${id}-ajuda` : undefined}
          style={{ paddingRight: 44 }}
        />
        <button
          type="button"
          className="btn btn-ghost btn-sm icon-btn"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visivel}
          style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 34, height: 34 }}
        >
          {visivel ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {nova && (
        <div id={`${id}-ajuda`} aria-live="polite">
          <div className={`forca-senha ${valor ? 'preenchida' : ''}`} data-nivel={forca.nivel} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <p className="hint" style={{ marginTop: 4 }}>
            {problemas.length
              ? problemas[0]
              : valor
                ? `Força: ${forca.rotulo}. Dica: frases longas são fortes e fáceis de lembrar.`
                : `Mínimo de ${SENHA_MIN} caracteres. Evite senhas óbvias, seu nome ou e-mail.`}
          </p>
        </div>
      )}
    </div>
  );
}
