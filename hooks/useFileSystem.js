'use client';

import { useState, useEffect, useCallback } from 'react';

const EXCLUDED_DIRS = new Set(['node_modules', '.next', '.git']);

/**
 * Recursively read the WebContainer filesystem into a tree structure.
 * @param {import('@webcontainer/api').WebContainer} wc
 * @param {string} dirPath
 * @returns {Promise<Array>}
 */
async function buildTree(wc, dirPath) {
  const entries = await wc.fs.readdir(dirPath, { withFileTypes: true });
  const nodes = [];

  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;

    const fullPath = dirPath === '/' ? `/${entry.name}` : `${dirPath}/${entry.name}`;

    if (entry.isDirectory()) {
      const children = await buildTree(wc, fullPath);
      nodes.push({ name: entry.name, path: fullPath, type: 'directory', children });
    } else {
      nodes.push({ name: entry.name, path: fullPath, type: 'file' });
    }
  }

  // Directories first, then alphabetical
  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Manages the file tree and current open file for a WebContainer instance.
 * @param {import('@webcontainer/api').WebContainer | null} webcontainer
 */
export function useFileSystem(webcontainer) {
  const [fileTree, setFileTree] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);

  const refreshTree = useCallback(async () => {
    if (!webcontainer) return;
    try {
      const tree = await buildTree(webcontainer, '/');
      setFileTree(tree);
    } catch (err) {
      console.error('[useFileSystem] refreshTree failed:', err);
    }
  }, [webcontainer]);

  /**
   * Read a file from the WebContainer filesystem.
   * Sets currentPath and returns the file content string.
   */
  const readFile = useCallback(
    async (path) => {
      if (!webcontainer) return '';
      try {
        const content = await webcontainer.fs.readFile(path, 'utf-8');
        setCurrentPath(path);
        return content;
      } catch (err) {
        console.error('[useFileSystem] readFile failed:', path, err);
        return '';
      }
    },
    [webcontainer]
  );

  /**
   * Write a file to the WebContainer filesystem.
   * Hot reload picks up the change automatically.
   */
  const writeFile = useCallback(
    async (path, content) => {
      if (!webcontainer) return;
      try {
        await webcontainer.fs.writeFile(path, content);
      } catch (err) {
        console.error('[useFileSystem] writeFile failed:', path, err);
      }
    },
    [webcontainer]
  );

  // Load the tree once the WebContainer instance is available
  useEffect(() => {
    if (webcontainer) {
      refreshTree();
    }
  }, [webcontainer, refreshTree]);

  return { fileTree, currentPath, readFile, writeFile, refreshTree };
}
