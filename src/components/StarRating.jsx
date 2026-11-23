// Avaliação por estrelas — interativa (com hover) ou somente leitura.

import { useState } from 'react';
import { Star } from 'lucide-react';

export default function StarRating({ value = 0, onChange, size = 22, readOnly = false }) {
  const [hover, setHover] = useState(0);
  const display = hover || value;

  // Somente leitura: um único rótulo ("Nota: 4 de 5") e estrelas decorativas — nada de botões.
  if (readOnly) {
    return (
      <div className="stars" role="img" aria-label={`Nota: ${value} de 5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className="star readonly" aria-hidden="true">
            <Star size={size} fill={n <= value ? '#f5a623' : 'none'} color={n <= value ? '#f5a623' : '#cdd5d0'} />
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="stars" role="radiogroup" aria-label={`Nota: ${value} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          className="star"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange?.(n)}
          aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
        >
          <Star size={size} fill={n <= display ? '#f5a623' : 'none'} color={n <= display ? '#f5a623' : '#cdd5d0'} />
        </button>
      ))}
    </div>
  );
}
