/**
 * Matches code blocks whose language tag looks like a file path.
 * Accepts: anything containing '/', or ending with a known extension.
 */
const FILE_PATH_RE = /^(?:[^`\n]*\/[^`\n]*|[^`\n]+\.(?:js|jsx|ts|tsx|mjs|cjs|css|json|md|mdx|html|svg))$/;

const CODE_BLOCK_RE = /```([^\n`]+)\n([\s\S]*?)```/g;

/**
 * Parse the AI's full response text.
 * @param {string} text
 * @returns {{ explanation: string, fileChanges: Array<{ filePath: string, content: string }> }}
 */
export function parseAIResponse(text) {
  const fileChanges = [];
  let explanation = text;

  // Reset lastIndex so the regex is stateless across calls
  CODE_BLOCK_RE.lastIndex = 0;

  const matches = [...text.matchAll(CODE_BLOCK_RE)];

  for (const match of matches) {
    const lang = match[1].trim();
    const content = match[2];

    if (FILE_PATH_RE.test(lang)) {
      // Normalise path: ensure it starts with /
      const filePath = lang.startsWith('/') ? lang : `/${lang}`;
      fileChanges.push({ filePath, content });
      // Strip the code block from the explanation
      explanation = explanation.replace(match[0], '').trim();
    }
  }

  return { explanation, fileChanges };
}
