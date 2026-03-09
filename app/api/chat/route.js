export const runtime = 'edge';

const SYSTEM_PROMPT = `You are an AI assistant embedded in a browser-based Next.js editor called WebWeave. Your job is to help users build and modify their Next.js websites.

You are talking to someone who may not know how to code. Explain what you're doing in simple terms.

When you make code changes, respond with the FULL updated file content in a code block with the file path as the language identifier. Format exactly like this:

\`\`\`path/to/file.js
// full file content here
\`\`\`

Rules:
- Only modify files that need to change
- Always return the COMPLETE file content, never partial snippets
- If creating a new file, specify the full path
- Keep code simple and clean
- Explain what you changed and why in plain language
- Use Tailwind CSS for styling when possible
- You are working with Next.js Pages Router (pages/ directory)`;

function buildMessages({ message, currentFile, currentFileContent, projectStructure, conversationHistory }) {
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

  // Add trimmed conversation history (last 10 messages)
  const history = (conversationHistory ?? []).slice(-10);
  for (const msg of history) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Build the user message with injected context
  let userContent = message;
  if (currentFile || projectStructure) {
    userContent += '\n\n---\nProject context:';
    if (projectStructure) {
      userContent += `\n\nProject files:\n${projectStructure}`;
    }
    if (currentFile && currentFileContent !== undefined) {
      userContent += `\n\nCurrently open file: ${currentFile}\n\`\`\`\n${currentFileContent}\n\`\`\``;
    }
  }

  messages.push({ role: 'user', content: userContent });
  return messages;
}

export async function POST(req) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'DEEPSEEK_API_KEY is not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const deepseekRes = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-reasoner',
      messages: buildMessages(body),
      stream: true,
    }),
  });

  if (!deepseekRes.ok) {
    const text = await deepseekRes.text();
    return new Response(JSON.stringify({ error: text }), {
      status: deepseekRes.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Forward the SSE stream directly to the client
  return new Response(deepseekRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
