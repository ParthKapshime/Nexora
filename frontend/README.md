# Nexora frontend

Nexora's frontend is a React and JavaScript single page application built with Vite. It talks to the Express backend over REST and never connects directly to MongoDB or an AI provider.

## Run locally

1. Install dependencies with `npm install` from this directory.
2. Leave `VITE_API_BASE_URL` empty in `.env.local` (or omit the file) to use same-origin `/api` requests.
3. Start the Express backend, then run `npm run dev` here. Vite listens on `http://localhost:3000` and proxies `/api` to `http://127.0.0.1:5000`, including when the frontend is opened through a forwarded port.

Set `VITE_API_BASE_URL` to an absolute backend origin only when intentionally bypassing the Vite proxy. A production deployment needs its own same-origin API reverse proxy or an explicitly configured API origin and matching backend CORS policy.

Vite exposes only `VITE_` variables to browser code. Never put database credentials, model tokens, or other secrets in frontend environment variables.

## Checks

- `npm run lint` — ESLint
- `npm test` — Vitest and React Testing Library
- `npm run build` — production bundle
- `npm run test:e2e` — Playwright Chromium tests (requires the Chromium browser installed by Playwright)

Playwright fixtures are synthetic and intercept API requests; they do not create or modify backend data. Screenshots from the responsive UI checks are in `qa/evidence/`.

## API capabilities and current limits

The UI integrates the backend's auth, profile/resume, skills, roadmaps, projects, interviews, applications, and AI routes. Resume uploads are parsed by the backend with `pdfjs-dist`; the profile shows extraction status and page count. Skills analysis, roadmap generation, project recommendations, and mock-interview question/evaluation flows call the Express AI endpoints and require `HF_TOKEN` on the backend. Generated roadmaps and projects are not written to the user's lists until the user explicitly saves them; saved records remain user content. The browser never calls Hugging Face directly.

The frontend has not been validated against a live account or database in this task. Use a non-production test account to verify live auth and data operations.
