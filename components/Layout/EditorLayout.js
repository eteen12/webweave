"use client";

import { useState, useRef, useCallback } from "react";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import Toolbar from "./Toolbar";
import StatusBar from "./StatusBar";
import PreviewPanel from "../Preview/PreviewPanel";
import EditorPanel from "../Editor/EditorPanel";
import ChatPanel from "../Chat/ChatPanel";
import { useWebContainer } from "../../hooks/useWebContainer";
import { useFileSystem } from "../../hooks/useFileSystem";
import { useChat } from "../../hooks/useChat";
import {
  zipToFileSystemTree,
  validateNextJsProject,
  exportProjectAsZip,
} from "../../lib/projectManagement";

function ResizeHandle({ onDraggingChange }) {
  const handlePointerDown = () => {
    onDraggingChange?.(true);
    document.addEventListener('pointerup', () => onDraggingChange?.(false), { once: true });
  };

  return (
    <PanelResizeHandle
      style={{
        width: "4px",
        height: "100%",
        background: "#3c3c3c",
        cursor: "col-resize",
        flexShrink: 0,
        transition: "background 0.15s",
        position: "relative",
        zIndex: 10,
      }}
      onPointerDown={handlePointerDown}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#0070f3")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "#3c3c3c")}
    />
  );
}

export default function EditorLayout() {
  const { status, previewUrl, error, webcontainer, resetWithTemplate, resetWithFiles } =
    useWebContainer();

  // File system lifted here so EditorPanel and chat handlers share it
  const { fileTree, readFile, writeFile, refreshTree } = useFileSystem(webcontainer);

  // Currently open file — passed as context to AI
  const [openFileInfo, setOpenFileInfo] = useState({ path: null, content: "" });
  const handleFileOpen = useCallback((path, content) => {
    setOpenFileInfo({ path, content });
  }, []);

  // Ref to EditorPanel for pushing AI edits into Monaco
  const editorPanelRef = useRef(null);

  // Chat
  const { messages, chatStatus, sendMessage, clearMessages } = useChat({
    currentPath: openFileInfo.path,
    currentFileContent: openFileInfo.content,
    fileTree,
  });

  const handleSendMessage = useCallback(
    async (text) => {
      const fileChanges = await sendMessage(text, {
        // Called on every content token while AI is writing a file block
        onActiveFileEdit: (path, partialContent) => {
          editorPanelRef.current?.streamFileContent(path, partialContent);
        },
      });

      if (!fileChanges?.length) return;

      // After stream ends, write final complete files to WebContainer
      for (const { filePath, content } of fileChanges) {
        await writeFile(filePath, content);
        // Push the definitive final content into Monaco
        editorPanelRef.current?.setExternalContent(filePath, content);
        if (filePath === openFileInfo.path) {
          setOpenFileInfo({ path: filePath, content });
        }
      }
      await refreshTree();
    },
    [sendMessage, writeFile, refreshTree, openFileInfo.path]
  );

  // ── Project management ─────────────────────────────────────────────────────

  const [projectName, setProjectName] = useState("Untitled Project");
  // True while parsing a zip (brief) — rebooting is reflected by status !== 'ready'
  const [isUploading, setIsUploading] = useState(false);

  const handleNew = useCallback(async () => {
    clearMessages();
    setProjectName("Untitled Project");
    setOpenFileInfo({ path: null, content: "" });
    resetWithTemplate();
  }, [clearMessages, resetWithTemplate]);

  const handleUpload = useCallback(
    async (file) => {
      setIsUploading(true);
      try {
        const fileTree = await zipToFileSystemTree(file);
        const { valid, reason } = validateNextJsProject(fileTree);
        if (!valid) {
          alert(`Cannot load project: ${reason}`);
          return;
        }
        clearMessages();
        setProjectName(file.name.replace(/\.zip$/i, ""));
        setOpenFileInfo({ path: null, content: "" });
        resetWithFiles(fileTree);
      } catch (err) {
        console.error("[Upload] Failed:", err);
        alert(`Failed to read zip: ${err.message}`);
      } finally {
        setIsUploading(false);
      }
    },
    [clearMessages, resetWithFiles]
  );

  const handleExport = useCallback(async () => {
    if (!webcontainer) return;
    await exportProjectAsZip(webcontainer, projectName || "webweave-project");
  }, [webcontainer, projectName]);

  // ── Resize drag overlay ────────────────────────────────────────────────────

  const [isDragging, setIsDragging] = useState(false);

  // Disable toolbar actions while container is loading or zip is parsing
  const toolbarDisabled = status !== "ready" || isUploading;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#1e1e1e",
        overflow: "hidden",
      }}
    >
      <Toolbar
        projectName={projectName}
        onNew={handleNew}
        onUpload={handleUpload}
        onExport={handleExport}
        disabled={toolbarDisabled}
      />

      <div style={{ flex: 1, overflow: "hidden", display: "flex", minHeight: 0 }}>
        <PanelGroup direction="horizontal" style={{ height: "100%", width: "100%" }}>
          {/* Panel 1: File Explorer + Monaco Editor */}
          <Panel defaultSize={40} minSize={15}>
            <div style={{ height: "100%", position: "relative" }}>
              {isDragging && <div style={{ position: "absolute", inset: 0, zIndex: 10 }} />}
              <EditorPanel
                ref={editorPanelRef}
                fileTree={fileTree}
                readFile={readFile}
                writeFile={writeFile}
                status={status}
                onFileOpen={handleFileOpen}
              />
            </div>
          </Panel>

          <ResizeHandle onDraggingChange={setIsDragging} />

          {/* Panel 2: AI Chat */}
          <Panel defaultSize={22} minSize={15}>
            <ChatPanel
              messages={messages}
              chatStatus={chatStatus}
              onSendMessage={handleSendMessage}
            />
          </Panel>

          <ResizeHandle onDraggingChange={setIsDragging} />

          {/* Panel 3: Live Preview */}
          <Panel defaultSize={38} minSize={15}>
            <div style={{ height: "100%", borderLeft: "1px solid #3c3c3c", position: "relative" }}>
              {isDragging && <div style={{ position: "absolute", inset: 0, zIndex: 10 }} />}
              <PreviewPanel status={status} previewUrl={previewUrl} error={error} />
            </div>
          </Panel>
        </PanelGroup>
      </div>

      <StatusBar status={status} />
    </div>
  );
}
