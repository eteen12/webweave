'use client';

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import dynamic from 'next/dynamic';
import { Panel, Group as PanelGroup, Separator } from 'react-resizable-panels';
import { ChevronRight, ChevronDown } from 'lucide-react';
import FileTree from './FileTree';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e1e1e', color: '#858585', fontSize: '13px' }}>
      Loading editor...
    </div>
  ),
});

const LANGUAGE_MAP = {
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript', tsx: 'typescript',
  css: 'css', json: 'json', md: 'markdown', html: 'html', mdx: 'markdown',
};

function getLanguage(filePath) {
  if (!filePath) return 'plaintext';
  const ext = filePath.split('.').pop()?.toLowerCase();
  return LANGUAGE_MAP[ext] ?? 'plaintext';
}

const WRITE_DEBOUNCE_MS = 300;

const EditorPanel = forwardRef(function EditorPanel(
  { fileTree, readFile, writeFile, status, onFileOpen },
  ref
) {
  const [editorPath, setEditorPath] = useState(null);
  // Stays true once a file has ever been opened — keeps Monaco mounted through file switches
  const [monacoMounted, setMonacoMounted] = useState(false);
  const [isDraggingHandle, setIsDraggingHandle] = useState(false);
  const [treeCollapsed, setTreeCollapsed] = useState(false);

  // Monaco refs — no key-remount, we switch files via setValue + setModelLanguage
  const editorRef = useRef(null);
  const monacoApiRef = useRef(null); // the monaco module from onMount
  const isExternalUpdateRef = useRef(false);
  const writeTimerRef = useRef(null);
  const editorPathRef = useRef(editorPath);
  editorPathRef.current = editorPath;

  // Panel ref for programmatic collapse/expand
  const treePanelRef = useRef(null);

  const toggleTree = useCallback(() => {
    if (treeCollapsed) {
      treePanelRef.current?.expand?.();
    } else {
      treePanelRef.current?.collapse?.();
    }
  }, [treeCollapsed]);

  // Track drag on the vertical Separator via pointer events (v4 has no onDragging prop)
  const handleSeparatorPointerDown = useCallback(() => {
    setIsDraggingHandle(true);
    document.addEventListener('pointerup', () => setIsDraggingHandle(false), { once: true });
  }, []);

  // ── Imperative API exposed to EditorLayout ──────────────────────────────────
  useImperativeHandle(ref, () => ({
    /**
     * Called after stream ends — write final complete content.
     * Only updates Monaco if the file is currently open.
     */
    setExternalContent(path, newContent) {
      if (path !== editorPathRef.current) return;
      isExternalUpdateRef.current = true;
      editorRef.current?.setValue(newContent);
    },

    /**
     * Called on every streaming token while the AI is writing a file.
     * Switches to the file if not already open, and streams partial content in.
     */
    streamFileContent(path, partialContent) {
      const isSameFile = path === editorPathRef.current;

      if (!isSameFile) {
        // Switch to the new file
        const lang = getLanguage(path);
        setEditorPath(path);

        if (editorRef.current && monacoApiRef.current) {
          monacoApiRef.current.editor.setModelLanguage(editorRef.current.getModel(), lang);
        }
      }

      setMonacoMounted(true);
      isExternalUpdateRef.current = true;
      editorRef.current?.setValue(partialContent);
    },
  }));

  // ── File open ───────────────────────────────────────────────────────────────
  const openFile = useCallback(
    async (path) => {
      const fileContent = await readFile(path);

      // Update language model if switching files
      if (path !== editorPathRef.current && editorRef.current && monacoApiRef.current) {
        monacoApiRef.current.editor.setModelLanguage(
          editorRef.current.getModel(),
          getLanguage(path)
        );
      }

      isExternalUpdateRef.current = true;
      setMonacoMounted(true);
      setEditorPath(path);
      editorRef.current?.setValue(fileContent);
      onFileOpen?.(path, fileContent);
    },
    [readFile, onFileOpen]
  );

  useEffect(() => {
    if (status === 'ready' && readFile) {
      openFile('/pages/index.js');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // ── Monaco handlers ─────────────────────────────────────────────────────────
  const handleChange = useCallback(
    (newValue) => {
      if (isExternalUpdateRef.current) {
        isExternalUpdateRef.current = false;
        return;
      }
      clearTimeout(writeTimerRef.current);
      writeTimerRef.current = setTimeout(() => {
        if (editorPathRef.current && newValue !== undefined) {
          writeFile(editorPathRef.current, newValue);
        }
      }, WRITE_DEBOUNCE_MS);
    },
    [writeFile]
  );

  const handleEditorMount = useCallback((editor, monacoApi) => {
    editorRef.current = editor;
    monacoApiRef.current = monacoApi;
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <PanelGroup direction="vertical" style={{ height: '100%', background: '#252526' }}>
      {/* File tree panel — collapsible */}
      <Panel
        panelRef={treePanelRef}
        defaultSize={22}
        minSize={0}
        collapsible
        collapsedSize={0}
        onResize={(size) => setTreeCollapsed(size === 0)}
      >
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Explorer header */}
          <button
            onClick={toggleTree}
            title={treeCollapsed ? 'Expand file tree' : 'Collapse file tree'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px 4px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              userSelect: 'none',
              flexShrink: 0,
              width: '100%',
              textAlign: 'left',
            }}
          >
            <span style={{ color: '#858585' }}>
              {treeCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', color: '#858585', textTransform: 'uppercase' }}>
              Explorer
            </span>
          </button>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            <FileTree fileTree={fileTree} currentPath={editorPath} onFileClick={openFile} />
          </div>
        </div>
      </Panel>

      {/* Vertical resize handle */}
      <Separator
        style={{ height: '4px', background: '#3c3c3c', cursor: 'row-resize', flexShrink: 0, transition: 'background 0.15s' }}
        onPointerDown={handleSeparatorPointerDown}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#0070f3')}
        onMouseLeave={(e) => { if (!isDraggingHandle) e.currentTarget.style.background = '#3c3c3c'; }}
      />

      {/* Monaco editor panel */}
      <Panel defaultSize={78} minSize={20}>
        <div style={{ height: '100%', overflow: 'hidden', position: 'relative' }}>
          {isDraggingHandle && <div style={{ position: 'absolute', inset: 0, zIndex: 10 }} />}

          {/* Toggle button overlaid on editor when tree is collapsed */}
          {treeCollapsed && (
            <button
              onClick={toggleTree}
              title="Expand file tree"
              style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                zIndex: 5,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                background: '#3c3c3c',
                border: '1px solid #5a5a5a',
                borderRadius: '4px',
                color: '#9d9d9d',
                fontSize: '11px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <ChevronRight size={11} />
              Files
            </button>
          )}

          {/* Monaco — mounted once first file opens, stays mounted through switches */}
          {monacoMounted && (
            <MonacoEditor
              defaultValue=""
              language={getLanguage(editorPath)}
              theme="vs-dark"
              onMount={handleEditorMount}
              onChange={handleChange}
              options={{
                minimap: { enabled: false },
                wordWrap: 'on',
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                padding: { top: editorPath ? 8 : 0 },
              }}
            />
          )}

          {/* Overlay when no file is open */}
          {!monacoMounted && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', background: '#1e1e1e', color: '#858585', fontSize: '13px', pointerEvents: 'none',
            }}>
              {status === 'ready' ? 'Select a file to edit' : 'Waiting for environment…'}
            </div>
          )}
        </div>
      </Panel>
    </PanelGroup>
  );
});

export default EditorPanel;
