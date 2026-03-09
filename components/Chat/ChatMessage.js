'use client';

import ReasoningBlock from './ReasoningBlock';
import { FileCode } from 'lucide-react';

// Matches code blocks whose language tag looks like a file path.
// Mirrors the logic in lib/parseAIResponse.js.
const FILE_PATH_RE = /^(?:[^`\n]*\/[^`\n]*|[^`\n]+\.(?:js|jsx|ts|tsx|mjs|cjs|css|json|md|mdx|html|svg))$/;

function isFilePath(lang) {
  return FILE_PATH_RE.test(lang.trim());
}

/**
 * Split message text into segments: plain text, file-change blocks, or generic code blocks.
 */
function parseContent(text) {
  const segments = [];
  const re = /```([^\n`]*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    const lang = match[1].trim();
    if (isFilePath(lang)) {
      // File-change block — show a compact badge, not the full code
      segments.push({ type: 'file', lang });
    } else {
      // Generic code block (e.g. shell commands, examples) — show normally
      segments.push({ type: 'code', lang, value: match[2] });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}

/** Small pill showing which file was updated */
function FileBadge({ path }) {
  const display = path.startsWith('/') ? path.slice(1) : path;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        margin: '4px 4px 4px 0',
        padding: '3px 8px',
        borderRadius: '4px',
        background: '#1a3a1a',
        border: '1px solid #2a5a2a',
        color: '#4ec94e',
        fontSize: '12px',
        fontFamily: 'monospace',
      }}
    >
      <FileCode size={12} />
      {display}
    </div>
  );
}

/** Collect consecutive file badges and render them together with a label */
function FileChangeGroup({ paths }) {
  return (
    <div style={{ margin: '8px 0' }}>
      <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#858585' }}>
        {paths.length === 1 ? 'Updated file:' : `Updated ${paths.length} files:`}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
        {paths.map((p) => <FileBadge key={p} path={p} />)}
      </div>
    </div>
  );
}

function CodeBlock({ lang, value }) {
  return (
    <div
      style={{
        margin: '8px 0',
        borderRadius: '4px',
        overflow: 'hidden',
        border: '1px solid #3c3c3c',
      }}
    >
      {lang && (
        <div
          style={{
            padding: '4px 10px',
            background: '#2d2d2d',
            color: '#858585',
            fontSize: '11px',
            fontFamily: 'monospace',
            borderBottom: '1px solid #3c3c3c',
          }}
        >
          {lang}
        </div>
      )}
      <pre
        style={{
          margin: 0,
          padding: '10px 12px',
          background: '#1a1a1a',
          color: '#d4d4d4',
          fontSize: '12px',
          fontFamily: 'monospace',
          overflowX: 'auto',
          lineHeight: '1.5',
          whiteSpace: 'pre',
        }}
      >
        {value}
      </pre>
    </div>
  );
}

function PlainText({ value }) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/(`[^`]+`)/g);
  return (
    <p style={{ margin: '4px 0', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
      {parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={i}
              style={{
                background: '#2d2d2d',
                color: '#d4d4d4',
                padding: '1px 5px',
                borderRadius: '3px',
                fontSize: '12px',
                fontFamily: 'monospace',
              }}
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      })}
    </p>
  );
}

function TypingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: '3px', alignItems: 'center', padding: '2px 0' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: '5px', height: '5px', borderRadius: '50%',
            background: '#858585',
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            display: 'inline-block',
          }}
        />
      ))}
    </span>
  );
}

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <div
          style={{
            maxWidth: '80%',
            padding: '8px 12px',
            borderRadius: '12px 12px 2px 12px',
            background: '#0070f3',
            color: '#ffffff',
            fontSize: '13px',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  // Placeholder — API not yet responded
  if (message.isPlaceholder && !message.content && !message.reasoning) {
    return (
      <div style={{ marginBottom: '16px' }}>
        <div style={{ background: '#252526', borderRadius: '2px 12px 12px 12px', padding: '10px 14px', border: '1px solid #3c3c3c', color: '#858585', fontSize: '13px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}>
          On it <TypingDots />
        </div>
      </div>
    );
  }

  // Assistant message — group consecutive file badges together
  const segments = parseContent(message.content || '');
  const rendered = [];
  let i = 0;

  while (i < segments.length) {
    const seg = segments[i];
    if (seg.type === 'file') {
      // Collect consecutive file segments into one group
      const filePaths = [];
      while (i < segments.length && segments[i].type === 'file') {
        filePaths.push(segments[i].lang);
        i++;
      }
      rendered.push(<FileChangeGroup key={`fg-${rendered.length}`} paths={filePaths} />);
    } else if (seg.type === 'code') {
      rendered.push(<CodeBlock key={i} lang={seg.lang} value={seg.value} />);
      i++;
    } else {
      rendered.push(<PlainText key={i} value={seg.value} />);
      i++;
    }
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      <ReasoningBlock reasoning={message.reasoning} />
      <div
        style={{
          background: '#252526',
          borderRadius: '2px 12px 12px 12px',
          padding: '10px 12px',
          color: '#d4d4d4',
          fontSize: '13px',
          border: '1px solid #3c3c3c',
        }}
      >
        {rendered.length === 0 && (
          <span style={{ color: '#858585', fontStyle: 'italic' }}>Thinking…</span>
        )}
        {rendered}
      </div>
    </div>
  );
}
