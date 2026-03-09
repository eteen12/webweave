'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea to fit content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [text]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = !disabled && text.trim().length > 0;

  return (
    <div
      style={{
        padding: '10px 12px',
        borderTop: '1px solid #3c3c3c',
        background: '#1e1e1e',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? 'AI is thinking...' : 'Ask AI to make changes… (Enter to send)'}
          rows={1}
          style={{
            flex: 1,
            minHeight: '36px',
            resize: 'none',
            background: '#2d2d2d',
            color: '#d4d4d4',
            border: '1px solid #3c3c3c',
            borderRadius: '6px',
            padding: '8px 10px',
            fontSize: '13px',
            outline: 'none',
            fontFamily: 'inherit',
            lineHeight: '1.4',
            overflowY: 'hidden',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => (e.target.style.borderColor = '#0070f3')}
          onBlur={(e) => (e.target.style.borderColor = '#3c3c3c')}
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          title="Send (Enter)"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            border: 'none',
            background: canSend ? '#0070f3' : '#3c3c3c',
            color: canSend ? '#ffffff' : '#858585',
            cursor: canSend ? 'pointer' : 'not-allowed',
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
        >
          <Send size={15} />
        </button>
      </div>
      <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#5a5a5a' }}>
        Shift+Enter for new line
      </p>
    </div>
  );
}
