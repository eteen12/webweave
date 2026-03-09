/**
 * Client-side project management: zip import and export.
 * Uses JSZip (imported dynamically so it only loads when needed).
 */

const EXCLUDED = new Set(['node_modules', '.next', '.git', '__MACOSX']);

// ─── Import ────────────────────────────────────────────────────────────────────

/**
 * Convert a zip File into a WebContainer FileSystemTree.
 * Handles:
 *   - Stripping a single wrapping root folder (common in GitHub downloads)
 *   - Skipping __MACOSX, .DS_Store, .git
 *   - Binary files (images, fonts, etc.) are read as Uint8Array
 */
export async function zipToFileSystemTree(zipFile) {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(zipFile);

  // Collect valid entries (non-directory, non-excluded)
  const entries = [];
  zip.forEach((relativePath, entry) => {
    if (entry.dir) return;
    const parts = relativePath.split('/');
    if (parts.some((p) => EXCLUDED.has(p) || p === '.DS_Store')) return;
    entries.push({ relativePath, entry });
  });

  // Detect single wrapping root folder (e.g. GitHub archive format)
  const topLevels = new Set(entries.map((e) => e.relativePath.split('/')[0]));
  let prefix = '';
  if (topLevels.size === 1) {
    const candidate = [...topLevels][0];
    if (entries.every((e) => e.relativePath.startsWith(candidate + '/'))) {
      prefix = candidate + '/';
    }
  }

  // Build the FileSystemTree
  const tree = {};

  for (const { relativePath, entry } of entries) {
    const strippedPath = relativePath.startsWith(prefix)
      ? relativePath.slice(prefix.length)
      : relativePath;
    if (!strippedPath) continue;

    const parts = strippedPath.split('/');
    const filename = parts.at(-1);

    // Navigate / create nested directory nodes
    let current = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      const dir = parts[i];
      if (!current[dir]) current[dir] = { directory: {} };
      current = current[dir].directory;
    }

    // Read file content — text vs binary
    if (isTextFile(filename)) {
      const contents = await entry.async('string');
      current[filename] = { file: { contents } };
    } else {
      const contents = await entry.async('uint8array');
      current[filename] = { file: { contents } };
    }
  }

  return tree;
}

/**
 * Check that the FileSystemTree looks like a Next.js project.
 */
export function validateNextJsProject(tree) {
  if (!tree['package.json']) return { valid: false, reason: 'No package.json found.' };

  try {
    const pkg = JSON.parse(tree['package.json'].file.contents);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (!deps['next']) {
      return { valid: false, reason: 'package.json does not list "next" as a dependency.' };
    }
  } catch {
    return { valid: false, reason: 'package.json is not valid JSON.' };
  }

  return { valid: true };
}

// ─── Export ────────────────────────────────────────────────────────────────────

/**
 * Read all files from a WebContainer instance and download as a zip.
 * Excludes node_modules, .next, .git.
 */
export async function exportProjectAsZip(webcontainer, projectName = 'webweave-project') {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  await collectFiles(webcontainer, '/', zip);

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  triggerDownload(blob, `${projectName}.zip`);
}

async function collectFiles(webcontainer, dirPath, zipFolder) {
  const entries = await webcontainer.fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (EXCLUDED.has(entry.name)) continue;
    const fullPath = dirPath === '/' ? `/${entry.name}` : `${dirPath}/${entry.name}`;

    if (entry.isDirectory()) {
      await collectFiles(webcontainer, fullPath, zipFolder.folder(entry.name));
    } else {
      // Read as Uint8Array — works for both text and binary
      const contents = await webcontainer.fs.readFile(fullPath);
      zipFolder.file(entry.name, contents);
    }
  }
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // Small delay before revoking so the browser can start the download
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const TEXT_EXTENSIONS = new Set([
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
  'json', 'css', 'html', 'md', 'mdx', 'txt',
  'yaml', 'yml', 'toml', 'env', 'lock',
  'gitignore', 'npmignore', 'prettierrc', 'eslintrc',
  'svg', 'xml',
]);

function isTextFile(filename) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return TEXT_EXTENSIONS.has(ext);
}
