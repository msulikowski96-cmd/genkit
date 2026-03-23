# Genkit starter app

This repository includes a minimal TypeScript Genkit app under `my-genkit-app/`.

## Quick start

1. Install dependencies:
   ```bash
   cd my-genkit-app
   npm install
   ```
2. Set your Google AI API key:
   ```bash
   export GOOGLE_API_KEY=your_api_key_here
   ```
3. Run the app:
   ```bash
   npm run start
   ```

## Available scripts

- `npm run dev` — run the app with `tsx`.
- `npm run start` — run the app once.
- `npm run typecheck` — validate the TypeScript source.
- `npm test` — alias for `npm run typecheck`.

If `GOOGLE_API_KEY` is missing, the app now starts safely and prints a warning instead of crashing during plugin setup.
