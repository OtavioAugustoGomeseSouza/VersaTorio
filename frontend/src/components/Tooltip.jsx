import { useState } from 'react';

export default function Tooltip({ text }) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="tooltip-wrapper">
      <button
        type="button"
        className="tooltip-trigger"
        aria-label={`Ajuda: ${text}`}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
      >
        ?
      </button>
      {visible && (
        <span className="tooltip-bubble" role="tooltip">
          {text}
        </span>
      )}
    </span>
  );
}
