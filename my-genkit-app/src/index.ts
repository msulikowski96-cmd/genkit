import { createServer } from 'node:http';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const apiKey = process.env.GOOGLE_API_KEY;
const port = Number(process.env.PORT ?? '3000');
const model = process.env.GENKIT_MODEL ?? 'gemini-2.5-flash';

export const ai = genkit({
  plugins: apiKey ? [googleAI({ apiKey })] : [],
});

if (!apiKey) {
  console.warn(
    'GOOGLE_API_KEY is not set. Add it to your environment before running Genkit prompts.',
  );
}

const html = (message: string, generatedText?: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Genkit + Specific starter</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 2rem auto; max-width: 48rem; line-height: 1.5; padding: 0 1rem; }
      code, pre { background: #f4f4f5; border-radius: 0.5rem; }
      code { padding: 0.1rem 0.3rem; }
      pre { padding: 1rem; overflow-x: auto; }
      .status { padding: 0.75rem 1rem; border-radius: 0.75rem; background: #eef2ff; margin-bottom: 1rem; }
      form { display: grid; gap: 0.75rem; margin: 1.5rem 0; }
      textarea { min-height: 8rem; padding: 0.75rem; font: inherit; }
      button { width: fit-content; padding: 0.7rem 1rem; font: inherit; cursor: pointer; }
    </style>
  </head>
  <body>
    <h1>Genkit starter running on Specific</h1>
    <p>This app is configured to run as a Specific service. Specific injects <code>PORT</code> and your secrets into the process, so the same app can run locally with <code>specific dev</code> and later deploy with <code>specific deploy</code>.</p>
    <div class="status">${message}</div>
    <form method="POST" action="/generate">
      <label for="prompt">Try a prompt with Genkit</label>
      <textarea id="prompt" name="prompt" placeholder="Write a short welcome message for a new Specific user."></textarea>
      <button type="submit">Generate</button>
    </form>
    ${generatedText ? `<h2>Model response</h2><pre>${generatedText}</pre>` : ''}
    <h2>Useful commands</h2>
    <pre>specific check
specific dev
specific deploy</pre>
  </body>
</html>`;

const parseFormBody = async (request: RequestLike): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const body = Buffer.concat(chunks).toString('utf8');
  return new URLSearchParams(body).get('prompt')?.trim() ?? '';
};

type RequestLike = AsyncIterable<string | Buffer>;

const server = createServer(async (request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: true, hasGoogleApiKey: Boolean(apiKey) }));
    return;
  }

  if (request.method === 'POST' && request.url === '/generate') {
    const prompt = await parseFormBody(request);

    if (!apiKey) {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(html('Set GOOGLE_API_KEY in Specific before trying prompts.'));
      return;
    }

    if (!prompt) {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(html('Enter a prompt to generate a response.'));
      return;
    }

    try {
      const generation = await ai.generate({
        model: googleAI.model(model),
        prompt,
      });

      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(html(`Generated with ${model}.`, generation.text));
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown generation error';
      response.writeHead(500, { 'content-type': 'text/html; charset=utf-8' });
      response.end(html(`Generation failed: ${message}`));
      return;
    }
  }

  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(
    html(
      apiKey
        ? `Ready on port ${port}. GOOGLE_API_KEY is configured.`
        : `Ready on port ${port}, but GOOGLE_API_KEY is not configured yet.`,
    ),
  );
});

server.listen(port, () => {
  console.log(`Genkit starter listening on http://localhost:${port}`);
});
