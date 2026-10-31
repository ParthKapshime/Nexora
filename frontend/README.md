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

The UI integrates the backend's auth, profile/resume, user-authored skills, roadmaps, projects, interviews, applications, and chat routes. Skill analysis, roadmap generation, project recommendations, and interview generation/evaluation are shown as unavailable because the current API does not implement those operations. Stored user-authored records are not presented as AI assessments or recommendations. The chat UI uses only the Express API route.

The frontend has not been validated against a live account or database in this task. Use a non-production test account to verify live auth and data operations.
