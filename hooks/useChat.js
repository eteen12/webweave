'use client';

import { useState, useCallback, useRef } from 'react';
import { parseAIResponse } from '../lib/parseAIResponse';

// Matches file paths — same rule as parseAIResponse
const FILE_PATH_RE = /^(?:[^`\n]*\/[^`\n]*|[^`\n]+\.(?:js|jsx|ts|tsx|mjs|cjs|css|json|md|mdx|html|svg))$/;

function flattenFileTree(tree, prefix = '') {
  const paths = [];
  for (const node of tree ?? []) {
    if (node.type === 'file') paths.push(prefix + node.name);
    else if (node.type === 'directory' && node.children)
      paths.push(...flattenFileTree(node.children, prefix + node.name + '/'));
  }
  return paths;
}

/**
 * Scan the accumulated response text to find any currently-open (unclosed) file code block.
 * Returns { filePath, content } or null.
 */
function getActiveFileBlock(text) {
  const lines = text.split('\n');
  let inBlock = false;
  let currentPath = null;
  const contentLines = [];

  for (const line of lines) {
    if (!inBlock) {
      if (line.startsWith('```')) {
        const lang = line.slice(3).trim();
        if (lang && FILE_PATH_RE.test(lang)) {
          inBlock = true;
          currentPath = lang.startsWith('/') ? lang : '/' + lang;
          contentLines.length = 0;
        }
      }
    } else {
      if (line === '```') {
        // Block is closed — reset
        inBlock = false;
        currentPath = null;
        contentLines.length = 0;
      } else {
        contentLines.push(line);
      }
    }
  }

  if (inBlock && currentPath) {
    return { filePath: currentPath, content: contentLines.join('\n') };
  }
  return null;
}

/**
 * @param {{ currentPath: string|null, currentFileContent: string, fileTree: Array }} opts
 */
export function useChat({ currentPath, currentFileContent, fileTree }) {
  const [messages, setMessages] = useState([]);
  const [chatStatus, setChatStatus] = useState('idle');

  const currentPathRef = useRef(currentPath);
  const currentFileContentRef = useRef(currentFileContent);
  const fileTreeRef = useRef(fileTree);
  currentPathRef.current = currentPath;
  currentFileContentRef.current = currentFileContent;
  fileTreeRef.current = fileTree;

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  /**
   * @param {string} text
   * @param {{ onActiveFileEdit?: (path: string, content: string) => void }} opts
   * @returns {Promise<Array<{ filePath: string, content: string }>>}
   */
  const sendMessage = useCallback(async (text, { onActiveFileEdit } = {}) => {
    const userMessage = { role: 'user', content: text };

    // Show user message + immediate "on it" placeholder before the API even responds
    setMessages((prev) => [
      ...prev,
      userMessage,
      { role: 'assistant', content: '', reasoning: '', model: null, isPlaceholder: true },
    ]);
    setChatStatus('thinking');

    const projectStructure = flattenFileTree(fileTreeRef.current).join('\n');
    const history = messagesRef.current.slice(-10);

    let response;
    try {
      response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          currentFile: currentPathRef.current,
          currentFileContent: currentFileContentRef.current,
          projectStructure,
          conversationHistory: history,
        }),
      });
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: `Network error: ${err.message}`, reasoning: '' };
        return updated;
      });
      setChatStatus('error');
      return [];
    }

    if (!response.ok) {
      const errText = await response.text();
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: `API error: ${errText}`, reasoning: '' };
        return updated;
      });
      setChatStatus('error');
      return [];
    }

    setChatStatus('streaming');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let fullReasoning = '';
    let selectedModel = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop();

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data: ')) continue;

          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);

            // Meta event — sent before the DeepSeek stream starts
            if (parsed.type === 'meta') {
              selectedModel = parsed.model === 'deepseek-chat' ? 'chat' : 'reasoner';
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  model: selectedModel,
                };
                return updated;
              });
              continue;
            }

            const delta = parsed.choices?.[0]?.delta;
            if (!delta) continue;

            if (delta.reasoning_content) fullReasoning += delta.reasoning_content;
            if (delta.content) fullContent += delta.content;

            // Update the placeholder message in place
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: 'assistant',
                content: fullContent,
                reasoning: fullReasoning,
                model: selectedModel,
                isPlaceholder: false,
              };
              return updated;
            });

            // Stream file content into Monaco as the code block grows
            if (onActiveFileEdit && delta.content) {
              const active = getActiveFileBlock(fullContent);
              if (active) onActiveFileEdit(active.filePath, active.content);
            }
          } catch {
            // Malformed JSON chunk — skip
          }
        }
      }
    } catch (err) {
      console.error('[useChat] stream read error:', err);
    }

    setChatStatus('idle');

    const { fileChanges } = parseAIResponse(fullContent);
    return fileChanges;
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setChatStatus('idle');
  }, []);

  return { messages, chatStatus, sendMessage, clearMessages };
}
