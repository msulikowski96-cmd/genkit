import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const apiKey = process.env.GOOGLE_API_KEY;

export const ai = genkit({
  plugins: apiKey ? [googleAI({ apiKey })] : [],
});

if (!apiKey) {
  console.warn(
    'GOOGLE_API_KEY is not set. Add it to your environment before running Genkit flows.',
  );
}
