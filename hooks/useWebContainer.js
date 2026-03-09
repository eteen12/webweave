'use client';

import { useState, useEffect } from 'react';
import { starterTemplate } from '../lib/templates/nextjs-starter.js';

/**
 * Module-level singleton.
 * WebContainer.boot() may only be called ONCE unless we teardown first.
 * All hook instances share this state via the `activeHooks` subscriber set.
 */
let _wcBootPromise = null;
let _wc = null;
let _setupStarted = false;

let _status = 'booting';
let _previewUrl = null;
let _error = null;

const activeHooks = new Set();

function broadcast(patch) {
  if ('status' in patch) _status = patch.status;
  if ('previewUrl' in patch) _previewUrl = patch.previewUrl;
  if ('error' in patch) _error = patch.error;
  activeHooks.forEach((fn) => fn({ status: _status, previewUrl: _previewUrl, error: _error }));
}

/**
 * Boot → mount files → npm install → npm run dev → server-ready
 * @param {import('@webcontainer/api').FileSystemTree | null} customFiles  null = starter template
 */
async function runSetup(customFiles) {
  try {
    console.log('[WebContainer] Booting...');
    const { WebContainer } = await import('@webcontainer/api');

    if (!_wcBootPromise) {
      _wcBootPromise = WebContainer.boot();
    }
    _wc = await _wcBootPromise;
    console.log('[WebContainer] Booted.');

    broadcast({ status: 'installing' });
    const files = customFiles ?? starterTemplate;
    console.log('[WebContainer] Mounting files...');
    await _wc.mount(files);
    console.log('[WebContainer] Files mounted. Running npm install...');

    const installProcess = await _wc.spawn('npm', ['install']);
    installProcess.output.pipeTo(
      new WritableStream({ write(chunk) { console.log('[install]', chunk); } })
    );
    const installExit = await installProcess.exit;
    if (installExit !== 0) throw new Error(`npm install failed (exit ${installExit})`);

    console.log('[WebContainer] npm install complete. Starting dev server...');
    broadcast({ status: 'starting' });

    const devProcess = await _wc.spawn('npm', ['run', 'dev']);
    devProcess.output.pipeTo(
      new WritableStream({ write(chunk) { console.log('[dev]', chunk); } })
    );

    _wc.on('server-ready', (port, url) => {
      console.log(`[WebContainer] Server ready on port ${port}: ${url}`);
      broadcast({ status: 'ready', previewUrl: url });
    });
  } catch (err) {
    console.error('[WebContainer] Setup failed:', err);
    broadcast({ status: 'error', error: err.message });
  }
}

/**
 * Tear down the current instance, reset all singletons, reboot with new files.
 * @param {import('@webcontainer/api').FileSystemTree | null} customFiles
 */
async function resetSetup(customFiles) {
  // Kill the running container
  if (_wc) {
    try {
      _wc.teardown();
    } catch (err) {
      console.warn('[WebContainer] teardown error (non-fatal):', err);
    }
  }

  // Reset singletons so runSetup works again
  _wc = null;
  _wcBootPromise = null;
  _setupStarted = false;
  _previewUrl = null;
  _error = null;

  broadcast({ status: 'booting', previewUrl: null, error: null });

  // Boot fresh
  _setupStarted = true;
  await runSetup(customFiles);
}

export function useWebContainer() {
  const [state, setState] = useState({
    status: _status,
    previewUrl: _previewUrl,
    error: _error,
  });

  useEffect(() => {
    const handleUpdate = (next) => setState(next);
    activeHooks.add(handleUpdate);

    // Sync current module state on mount (handles StrictMode re-mount)
    setState({ status: _status, previewUrl: _previewUrl, error: _error });

    if (!_setupStarted) {
      _setupStarted = true;
      runSetup(null);
    }

    return () => {
      activeHooks.delete(handleUpdate);
    };
  }, []);

  return {
    status: state.status,
    previewUrl: state.previewUrl,
    error: state.error,
    webcontainer: _wc,
    /** Reset to starter template */
    resetWithTemplate: () => resetSetup(null),
    /** Reset with a custom FileSystemTree (e.g. from a zip upload) */
    resetWithFiles: (fileTree) => resetSetup(fileTree),
  };
}
