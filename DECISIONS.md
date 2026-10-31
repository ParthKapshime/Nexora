# Nexora project decisions

## 2026-10-31 — Frontend implementation

- The app uses React, JavaScript, Vite, and React Router in `frontend/`, following the current `AGENTS.md`. Authenticated pages share one responsive shell and the warm light visual system from `docs/references/nexora-ui-workflow-reference.png`.
- Browser requests go through the Express REST API. The browser never connects to MongoDB or directly to an AI provider. With `VITE_API_BASE_URL` unset, browser calls use same-origin `/api` paths and Vite proxies them to the local Express service. The proxy rewrites the upstream Origin to the backend's existing localhost CORS origin so forwarded frontend requests can use the existing API without backend changes. Browser-exposed environment variables must never contain secrets.
- Frontend integration covers auth, profile and PDF resume operations, user-authored skill/roadmap/project/interview records, job applications, and the Express chat-completions route. Unsupported analysis, generation, recommendations, and interview evaluation are identified in the UI instead of being simulated.
- Readiness and profile completion display only values derived from returned data. The UI does not invent assessment results or AI-generated records.
- E2E browser fixtures are synthetic and intercepted in Playwright; they do not write to MongoDB. Live auth and data workflows still need validation with a dedicated test account.
- The backend code currently contains a hosted Hugging Face chat provider, while the current project guidance specifies Ollama only. Backend files are outside this frontend change's scope. The frontend calls only the Express endpoint; provider compliance remains unresolved in the backend.
- Verification on 2026-10-31: `npm run lint` passed; `npm test` passed (3 files, 8 tests); `npm run build` passed; `npm run test:e2e` passed (7 Chromium tests, one worker), including desktop/tablet/mobile layout, unauthenticated access, backend outage handling, and empty records. A read-only request through the Vite proxy with the forwarded-site Origin returned the expected backend 401 and CORS headers. No registration or account data was submitted.
