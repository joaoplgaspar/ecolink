// Avaliação por estrelas — interativa (com hover) ou somente leitura.

import { useState } from 'react';
import { Star } from 'lucide-react';

export default function StarRating({ value = 0, onChange, size = 22, readOnly = false }) {
  const [hover, setHover] = useState(0);
  const display = hover || value;

  return (
    <div className="stars" role={readOnly ? 'img' : 'radiogroup'} aria-label={`Nota: ${value} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star ${readOnly ? 'readonly' : ''}`}
          disabled={readOnly}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(0)}
          onClick={() => !readOnly && onChange?.(n)}
          aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
        >
          <Star
            size={size}
            fill={n <= display ? '#f5a623' : 'none'}
            color={n <= display ? '#f5a623' : '#cdd5d0'}
          />
        </button>
      ))}
    </div>
  );
}
