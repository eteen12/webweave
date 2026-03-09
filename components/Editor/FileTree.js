'use client';

import { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  FileJson,
} from 'lucide-react';

const FILE_ICONS = {
  js: FileCode,
  jsx: FileCode,
  ts: FileCode,
  tsx: FileCode,
  json: FileJson,
  md: FileText,
  css: FileText,
  mjs: FileCode,
  cjs: FileCode,
  html: FileCode,
};

function getFileIcon(name) {
  const ext = name.split('.').pop()?.toLowerCase();
  return FILE_ICONS[ext] ?? FileText;
}

function FileTreeNode({ node, currentPath, onFileClick, depth }) {
  // Expand top-level directories by default
  const [expanded, setExpanded] = useState(depth === 0);

  const indent = depth * 12;

  if (node.type === 'directory') {
    return (
      <div>
        <button
          onClick={() => setExpanded((e) => !e)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            width: '100%',
            padding: `3px 8px 3px ${indent + 8}px`,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#cccccc',
            fontSize: '13px',
            textAlign: 'left',
            userSelect: 'none',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#2a2d2e')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <span style={{ color: '#858585', flexShrink: 0 }}>
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
          <span style={{ color: '#dcb67a', flexShrink: 0 }}>
            {expanded ? <FolderOpen size={14} /> : <Folder size={14} />}
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.name}
          </span>
        </button>
        {expanded && node.children?.map((child) => (
          <FileTreeNode
            key={child.path}
            node={child}
            currentPath={currentPath}
            onFileClick={onFileClick}
            depth={depth + 1}
          />
        ))}
      </div>
    );
  }

  // File node
  const Icon = getFileIcon(node.name);
  const isActive = node.path === currentPath;

  return (
    <button
      onClick={() => onFileClick(node.path)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        width: '100%',
        padding: `3px 8px 3px ${indent + 22}px`,
        background: isActive ? '#37373d' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: isActive ? '#ffffff' : '#cccccc',
        fontSize: '13px',
        textAlign: 'left',
        userSelect: 'none',
        borderLeft: isActive ? '1px solid #0070f3' : '1px solid transparent',
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.background = '#2a2d2e';
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = 'transparent';
      }}
    >
      <span style={{ color: '#858585', flexShrink: 0 }}>
        <Icon size={14} />
      </span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {node.name}
      </span>
    </button>
  );
}

export default function FileTree({ fileTree, currentPath, onFileClick }) {
  if (!fileTree || fileTree.length === 0) {
    return (
      <div style={{ padding: '12px 16px', color: '#858585', fontSize: '12px' }}>
        No files loaded yet.
      </div>
    );
  }

  return (
    <div style={{ padding: '4px 0' }}>
      {fileTree.map((node) => (
        <FileTreeNode
          key={node.path}
          node={node}
          currentPath={currentPath}
          onFileClick={onFileClick}
          depth={0}
        />
      ))}
    </div>
  );
}
