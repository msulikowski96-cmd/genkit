# Genkit starter app with Specific

This repository now includes a minimal TypeScript Genkit app under `my-genkit-app/` that is wired up for [Specific](https://specific.dev/) local development and deployment.

## What changed

- Installed and initialized Specific for Codex in `my-genkit-app/`.
- Added a `specific.hcl` that defines one public Node service for the Genkit app.
- Declared `GOOGLE_API_KEY` as a Specific secret instead of relying on a checked-in `.env` workflow.
- Updated the sample app to run an HTTP server that uses the `PORT` Specific injects.

## Quick start with Specific

1. Install dependencies for the app if you have not already:
   ```bash
   cd my-genkit-app
   npm install
   ```
2. Validate the infrastructure config:
   ```bash
   specific check
   ```
3. Start the full local environment:
   ```bash
   specific dev
   ```
4. When prompted, provide `google_api_key` for local development. Specific stores local values in `specific.local`.
5. Open the local URL printed by `specific dev` and try the sample prompt form.

## Useful Specific commands

- `specific docs` — open the LLM-oriented Specific docs.
- `specific check` — validate `specific.hcl` after every infrastructure change.
- `specific dev` — run the local development environment with injected env vars.
- `specific deploy` — deploy once you have logged in with `specific login`.

## App scripts

From `my-genkit-app/`:

- `npm run dev` — run the HTTP app with `tsx`.
- `npm run start` — same as dev, suitable for the Specific service command.
- `npm run typecheck` — validate the TypeScript source.
- `npm test` — alias for `npm run typecheck`.
