'use client';

import { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { Bot } from 'lucide-react';

const BUSY_STATES = new Set(['thinking', 'streaming']);

export default function ChatPanel({ messages, chatStatus, onSendMessage }) {
  const bottomRef = useRef(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isBusy = BUSY_STATES.has(chatStatus);

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#1e1e1e',
        borderLeft: '1px solid #3c3c3c',
        borderRight: '1px solid #3c3c3c',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 14px',
          borderBottom: '1px solid #3c3c3c',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <Bot size={15} style={{ color: '#0070f3' }} />
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#cccccc', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          AI Chat
        </span>
        {isBusy && (
          <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#858585', fontStyle: 'italic' }}>
            {chatStatus === 'thinking' ? 'Thinking…' : 'Streaming…'}
          </span>
        )}
      </div>

      {/* Message list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 12px',
          minHeight: 0,
        }}
      >
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          messages.map((msg, i) => <ChatMessage key={i} message={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={onSendMessage} disabled={isBusy} />
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        color: '#5a5a5a',
        textAlign: 'center',
        padding: '24px',
      }}
    >
      <Bot size={32} style={{ color: '#3c3c3c' }} />
      <p style={{ margin: 0, fontSize: '14px', color: '#858585' }}>
        Ask AI to build or modify your site
      </p>
      <p style={{ margin: 0, fontSize: '12px' }}>
        Try: "Make the heading blue" or "Add a contact form"
      </p>
    </div>
  );
}
