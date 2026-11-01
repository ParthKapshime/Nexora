# Nexora Backend & Architecture Analysis

This document contains a detailed analysis of the Nexora project structure, implementation, authentication, API communication, security posture, and recommended improvements.

---

## 1. Folder Structure

### Root
```
Nexora/
├── .git/
├── .gitignore
├── AGENTS.md              # Project guidance / architecture rules
├── DECISIONS.md           # Architecture decision records
├── decision.html
├── error.md
├── test.md
├── docs/
│   └── references/
│       └── nexora-ui-workflow-reference.png   # UI reference image
├── backend/               # Node.js + Express + MongoDB
└── frontend/              # React + Vite + Tailwind
```

### Backend (`backend/`)
```
backend/
├── server.js              # App entry point (startup, DB connect, graceful shutdown)
├── app.js                 # Express app factory (middleware, routes, error handling)
├── openapi.json           # Generated OpenAPI spec
├── package.json
├── .env / .env.example    # Environment config (not committed)
├── scripts/writeOpenApi.js
├── config/                # env.js (Zod validation), database.js (Mongoose), openapi.js (spec)
├── controllers/           # authController, profileController, applicationController,
│                          # resumeController, resourceController, aiController
├── middleware/            # auth.js (JWT), errorHandler.js, requestId.js, validate.js (Zod)
├── models/                # User.js, Application.js, UserResource.js (Mongoose schemas)
├── routes/                # authRoutes, profileRoutes, applicationRoutes,
│                          # resourceRoutes.js, aiRoutes.js
├── services/              # resumeService.js (multer), resumeParser.js (pdfjs),
│                          # skillAnalysisService.js (stub), ai/
│                          #    aiService.js, huggingFace.js, aiFeatures.js, prompts.js
├── utils/                 # apiError.js, asyncHandler.js
├── validators/            # auth.js, profile.js, application.js, resource.js, ai.js, common.js
├── test/                  # 6 Node test files (node --test)
├── src/                   # EMPTY - config/, middleware/, models/, utils/, validators/ all empty
└── node_modules/
```

### Frontend (`frontend/`)
```
frontend/
├── index.html
├── vite.config.js         # Vite, Tailwind, port 3000, /api proxy → http://127.0.0.1:5000
├── eslint.config.js
├── vitest.config.js
├── playwright.config.js
├── package.json
├── .env.example
├── public/                # favicon.svg, icons.svg
├── src/
│   ├── main.jsx
│   ├── App.jsx            # Router + AuthProvider + lazy routes
│   ├── index.css / App.css
│   ├── lib/               # api.js (Axios), utils.js (cn), api.test.js
│   ├── context/           # AuthContext.jsx, auth-context.js, useAuth.js
│   ├── hooks/             # useResourceCollection.js
│   ├── pages/             # 13 pages (Landing, Auth, Dashboard, Profile, Skills, Learning,
│   │                       Projects, Interviews, Applications, Guidance, Login, Register)
│   ├── components/
│   │   ├── layout/AppLayout.jsx          # Sidebar + topbar header
│   │   ├── PageHeading.jsx, ProtectedRoute.jsx, StatusBadge.jsx, ResourceCollectionPage.jsx
│   │   └── ui/               # Button, Card, Badge, Input/Textarea, Feedback (shadcn-like)
│   ├── assets/            # hero.png, react.svg, vite.svg
│   └── test/              # setup.js
├── e2e/                   # 3 Playwright spec files
├── qa/                    # evidence/
├── dist/                  # Build output
├── node_modules/
└── test-results/
```

---

## 2. Architecture Overview

### Backend layering (clean separation)

```
Routes → Controllers → Models (+ Services) ← Middleware (auth, validate, errorHandler, requestId)
```

- **Routes** define endpoints and apply `requireAuth` + `validate(Zod schema)` + `asyncHandler`.
- **Controllers** contain business logic, call models/services, return JSON.
- **Models** are Mongoose schemas with strict mode (`strict: 'throw'`).
- **Services** handle external concerns: file storage (multer), PDF parsing (pdfjs-dist), Hugging Face (OpenAI-compatible router).

### Routes registered in `app.js`

| Prefix | Endpoints | Auth |
|--------|-----------|------|
| `/api/auth` | register, login (rate-limited), me | register/login: no; me: yes |
| `/api/profile` | GET/PATCH profile, POST/DELETE resume | yes |
| `/api/applications` | CRUD + filter by status + pagination | yes |
| `/api/skills` | CRUD (generic resource) | yes |
| `/api/roadmaps` | CRUD (generic resource) | yes |
| `/api/projects` | CRUD (generic resource) | yes |
| `/api/interviews` | CRUD (generic resource) | yes |
| `/api/ai` | chat/completions, analyze-skills, roadmap/generate, projects/recommend, interviews/start, interviews/:id/answer | yes |

### Frontend routing (`App.jsx`)

- Public: `/`, `/login`, `/register`
- Protected (via `ProtectedRoute` + `AppLayout`): `/dashboard`, `/profile`, `/skills`, `/learning`, `/projects`, `/interviews`, `/applications`, `/guidance`
- `ProtectedRoute` checks auth status (loading / offline / unauthenticated / authenticated) and redirects to `/login` if not authenticated.

---

## 3. Authentication Implementation

### Backend (`auth.js`, `authController.js`)

- Password hashing: `bcryptjs` with 12 salt rounds.
- JWT: `jsonwebtoken`, HS256, 300-second (5 min) TTL, token payload = `{ sub: user.id }` only (no email/roles claims).
- Login: finds user by email, compares password, returns `{ user, token, tokenType: 'Bearer', expiresIn: 300 }`.
- Registration: checks email uniqueness, hashes password, creates user, issues token.
- Auth middleware (`requireAuth`): extracts `Bearer` token from `Authorization` header, verifies JWT, loads user (`_id`, `email`, `profile`), attaches to `req.user`.
- `JWT_SECRET` must be ≥32 chars (enforced at startup and in production env validation).

### Frontend (`AuthContext.jsx`, `lib/api.js`)

- Token stored in `sessionStorage` under key `nexora.auth.token`.
- Axios request interceptor attaches `Bearer <token>` from sessionStorage.
- Response interceptor: on 401, clears token and dispatches `nexora:session-expired` event.
- `AuthProvider` calls `/api/auth/me` on mount to restore session; listens for session-expiry events.
- `AuthPage` handles both login and register modes with Zod validation (email, password min 10 / max 128 chars, 72-byte UTF-8 limit for bcrypt).

### No refresh token mechanism

When the 5-minute JWT expires, the user gets a 401 and must re-login. There is no silent token refresh.

---

## 4. API Communication

### Frontend → Backend: Axios instance (`frontend/src/lib/api.js`)

- `baseURL`: `/api` (relative, resolved by Vite dev server).
- Vite proxy (`vite.config.js`): `/api` → `http://127.0.0.1:5000`, sets `origin: http://localhost:3000` header (needed for CORS allowlist).
- Timeout: 20s default; 60s for AI endpoints.
- Modular API objects: `authApi`, `profileApi`, `applicationsApi`, `resourcesApi`, `aiApi`.
- `getErrorMessage()` normalizes Axios errors into user-facing strings (handles 401, 503, 500, connection errors).

### CORS

Backend allows origins from `CORS_ORIGINS` env (default `http://localhost:3000`). Preflight handled. Credentials not explicitly configured (no `credentials: true`).

### Backend → Hugging Face

OpenAI SDK pointed at `https://router.huggingface.co/v1` with `HF_TOKEN`. Structured JSON output via system prompt + Zod validation, with one retry on parse failure.

---

## 5. Potential Bugs & Incomplete Implementations

### A. Empty `backend/src/` directory (structural inconsistency)

The `backend/src/` subdirectories (`config/`, `middleware/`, `models/`, `utils/`, `validators/`) are all **empty**. The actual source code lives at the top level of `backend/` (`backend/config/`, `backend/controllers/`, etc.). This is misleading and could cause confusion for new developers or tooling that expects source under `src/`.

### B. `ProfilePage.jsx` — duplicated data loading, dead `load` callback

`ProfilePage.jsx:55-71` has a `useEffect` that inline-fetches the profile. Separately, a `load` callback (line 42-53) duplicates the same logic but is **never called on mount** — only invoked by `retry`. This is redundant code.

### C. `skillAnalysisService.js` — dead code

`backend/services/skillAnalysisService.js` exports `analyzeSkills()` which calls `ensureAIAvailable()` then throws `"AI provider interface is not configured"`. It is **not imported anywhere**. The real AI logic lives in `services/ai/aiFeatures.js`, called directly by `aiController.js`.

### D. Token expiration UX

JWT TTL is 300 seconds (5 minutes) with **no refresh token**. On expiry, the frontend clears the token and the user must log in again. There is no silent token refresh or re-authentication flow.

### E. `DashboardPage.jsx` — roadmap completion counting

Line 50: `data.roadmaps.filter((entry) => entry.data?.completed === true)`. The `useResourceCollection` hook creates roadmap items with `completed: false` (via `doneKey`). `updateDone` toggles it. This works but relies on `data.completed` being a boolean — if a roadmap was created before this logic existed, `completed` would be `undefined` and not counted.

### F. Frontend `resourcesApi.list(kind)` path

`resourcesApi.list(kind)` calls `api.get(`/${kind}`)` → resolves to `/api/skills`, `/api/roadmaps`, etc. This correctly matches backend mounts. No bug, but brittle if route prefixes change.

### G. `InterviewsPage.jsx` — `sessionTitle` fallback

`sessionTitle` checks `data.title || data.role || data.jobTitle`. Interview records store `title`, so this is fine. No issue.

### H. `AuthPage.jsx` — `navigate` on success

On successful login/register, navigates to `location.state?.from?.pathname || '/dashboard'`. The `from` state is set by `ProtectedRoute` on redirect. Works correctly.

### I. No password reset / email verification

Not implemented. Registration and login only. This is a missing feature, not a bug.

---

## 6. Security Review

### Good practices in place

- **Helmet** with CSP (`defaultSrc: 'self'`, `objectSrc: 'none'`, `frameAncestors: 'none'`), HSTS in production.
- **CORS** with origin allowlist (not wildcard).
- **express-mongo-sanitize** to prevent NoSQL injection.
- **Rate limiting**: global 300/15min, auth 10/15min, resume upload 5/hour, AI 60/15min.
- **JWT secret** ≥32 chars enforced at startup and in production.
- **bcryptjs** 12 rounds; 72-byte password limit enforced (validator + OpenAPI docs note it).
- **Mongoose strict mode** (`strict: 'throw'`) prevents unexpected fields.
- **File upload safety**: multer disk storage with UUID filenames, PDF magic-byte validation (`%PDF-`), file size limit 5 MiB, MIME + extension check, path-traversal regex before deleting old files.
- **PDF parsing timeout** (15s), page limit (30), text limit (50k chars), password-protected PDF rejection.
- **Centralized error handling** (`ApiError`, `asyncHandler`, `errorHandler`) — no raw stack traces leaked to client (500 errors show generic message).
- **`x-powered-by`** disabled.
- **OpenAPI/Swagger** documents all endpoints with auth requirements.
- **Tokens in sessionStorage only** (not localStorage), reducing XSS persistence risk.

### Security concerns

- **No `secure`/`HttpOnly` cookie option** — tokens are in JS-accessible `sessionStorage`, vulnerable to XSS theft. Consider HttpOnly cookies if XSS risk is a concern.
- **No refresh token** — short-lived JWT forces frequent re-login; no silent renewal.
- **`openai` dependency** used with Hugging Face router — fine per AGENTS.md (HF is the only AI provider, server-side only).
- **`.env` exists in backend** (not `.env.example`) — contains real secrets. Confirm it's in `.gitignore`. (`.gitignore` wasn't read but `.env.example` exists, suggesting `.env` is ignored.)
- **No account lockout** beyond rate limiting on auth endpoints.

---

## 7. Recommended Improvements

1. **Fix `backend/src/` structure** — either move all source into `backend/src/` (and update `server.js`/`app.js` requires) or remove the empty `backend/src/` directory to avoid confusion.

2. **Add refresh token mechanism** — issue a refresh token (longer TTL, stored HttpOnly) alongside the access token, with a `/api/auth/refresh` endpoint, so users aren't logged out every 5 minutes.

3. **Remove dead code** — delete or repurpose `backend/services/skillAnalysisService.js`.

4. **Deduplicate `ProfilePage.jsx` loading** — use the `load` callback in the `useEffect` instead of inline duplication.

5. **Add password reset / email verification** — for a complete auth flow.

6. **Consider HttpOnly cookies** for token storage instead of sessionStorage, to mitigate XSS token theft.

7. **Add backend integration tests** that don't require a live DB (the `live-auth.integration.test.js` requires MongoDB; other tests use `node --test`).

8. **Add frontend test coverage** for more pages (currently only `ProtectedRoute` and `AuthPage` are unit-tested).

9. **Add OpenAPI spec generation to CI** — `openapi.json` is generated by `scripts/writeOpenApi.js`; ensure it stays in sync with route changes.

10. **Add `credentials: 'include'` to CORS** if you switch to cookie-based auth.
