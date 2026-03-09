const CLASSIFIER_SYSTEM_PROMPT = `You are a task complexity router for a Next.js code editor. Classify the user's request as SIMPLE or COMPLEX.

SIMPLE — use the fast model:
- Changing colors, text content, fonts, spacing, sizing
- Small CSS or Tailwind class changes
- Toggling visibility, show/hide elements
- Renaming text, labels, headings
- Simple questions about the code ("what does this do?")
- Single-file edits that are obvious and straightforward
- Removing an element
- Changing one component's props

COMPLEX — use the reasoning model:
- Building a new page, component, or feature from scratch
- Adding functionality like forms, auth, API calls, navigation
- Multi-file changes that need to stay in sync
- Restructuring, refactoring, or reorganizing code
- Creating layouts, grids, responsive designs from scratch
- Anything that requires planning before coding
- "Build me a..." or "Create a..." requests for non-trivial things
- Database, state management, or data flow changes
- The user describes a whole app, section, or feature

Respond with ONLY the word SIMPLE or COMPLEX. Nothing else.`;

/**
 * Classifies a user message as 'SIMPLE' or 'COMPLEX' using a fast, non-streaming
 * deepseek-chat call. Defaults to 'COMPLEX' on any failure.
 *
 * @param {string} message
 * @param {string} apiKey
 * @returns {Promise<'SIMPLE' | 'COMPLEX'>}
 */
export async function classifyComplexity(message, apiKey) {
  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: CLASSIFIER_SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
        max_tokens: 5,
        stream: false,
      }),
    });

    if (!res.ok) return 'COMPLEX';

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim().toUpperCase() ?? '';
    return text.startsWith('SIMPLE') ? 'SIMPLE' : 'COMPLEX';
  } catch {
    return 'COMPLEX';
  }
}
