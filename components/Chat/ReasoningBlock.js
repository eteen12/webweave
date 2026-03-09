'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

export default function ReasoningBlock({ reasoning }) {
  const [expanded, setExpanded] = useState(false);

  if (!reasoning) return null;

  return (
    <div
      style={{
        marginBottom: '8px',
        borderRadius: '4px',
        border: '1px solid #3c3c3c',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          width: '100%',
          padding: '6px 10px',
          background: '#2d2d2d',
          border: 'none',
          cursor: 'pointer',
          color: '#858585',
          fontSize: '12px',
          textAlign: 'left',
          userSelect: 'none',
        }}
      >
        <span style={{ color: '#858585', flexShrink: 0 }}>
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        <span style={{ fontStyle: 'italic' }}>Thinking...</span>
      </button>

      {expanded && (
        <div
          style={{
            padding: '8px 12px',
            background: '#252526',
            color: '#858585',
            fontSize: '12px',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            maxHeight: '200px',
            overflowY: 'auto',
          }}
        >
          {reasoning}
        </div>
      )}
    </div>
  );
}
