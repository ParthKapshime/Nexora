# Nexora backend test record

## Testing overview

- **Date:** 2026-10-31 (Asia/Kolkata)
- **Stage:** Backend foundation and REST module implementation
- **Runtime:** Node.js v24.13.0; npm 11.6.2; Express 4.
- **Server:** Intended URL `http://localhost:5000`. `npm start` was attempted and exited before listening because local `JWT_SECRET` is not configured. MongoDB URI is also absent; no Atlas connection was attempted.
- **Database:** Not connected. Config enforces MongoDB database path `Nexora`.
- **Tools:** Node test runner, Supertest, npm audit, PowerShell, Git. Thunder Client UI/CLI was not available in the current tool session.
- **ECC:** Read/applied `backend-patterns`, `api-design`, `security-review`, `error-handling`; `database-migrations` was inspected but no migration was needed. `security-scan` targets Claude config absent from this repository. No agents/workflow commands used.
- **Earlier inventory:** Initial inspection found empty source placeholders and no root Git repo; no tests were run then. User approved local Git setup during the continuation. The AI-inactive decision is implemented.

## Implemented API endpoints

| Module | Methods and paths | Behavior / response notes |
|---|---|---|
| Health | `GET /healthz`, `GET /readyz` | Liveness and database readiness (`200` or `503`). |
| API docs | `GET /openapi.json`, `GET /api-docs/` | OpenAPI document and Swagger UI. |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` | Registration `201`; login `200`; protected identity. Invalid input `400`, duplicate account `409`, invalid credentials/token `401`, missing JWT config `503`. |
| Profile | `GET /api/profile`, `PATCH /api/profile` | Own profile only; Zod validation. |
| Resume | `POST /api/profile/resume`, `DELETE /api/profile/resume` | Authenticated PDF upload (5 MiB limit), private storage and safe metadata; delete own file. |
| Applications | `GET/POST /api/applications`; `GET/PATCH/DELETE /api/applications/:id` | Owner-scoped CRUD, status filtering and pagination. |
| User-provided skills | `GET/POST /api/skills`; `PATCH/DELETE /api/skills/:id` | CRUD for content supplied by the user. No generated assessment. |
| User-provided roadmaps | `GET/POST /api/roadmaps`; `PATCH/DELETE /api/roadmaps/:id` | CRUD for explicitly supplied records; no generated roadmap. |
| User-provided projects | `GET/POST /api/projects`; `PATCH/DELETE /api/projects/:id` | CRUD for explicitly supplied records; no recommendation dataset. |
| User-provided interview records | `GET/POST /api/interviews`; `PATCH/DELETE /api/interviews/:id` | CRUD for user-provided records. |
| AI-dependent actions | `POST /api/ai/analyze-skills`, `/roadmap/generate`, `/projects/recommend`, `/interviews/start`, `/interviews/:id/answer` | Authenticated requests return controlled `503 AI functionality is currently unavailable`; no LLM calls or fabricated output. |

## Automated API test cases

The test harness uses Supertest. Database model methods are mocked for auth/write/ownership tests; therefore these results verify route logic and ownership filters, not Atlas persistence. All actual response bodies below omit tokens and private fields.

| Test ID | Module | Method | Endpoint / case | Expected result | Actual result | Status | Notes |
|---|---|---|---|---|---|---|---|
| API-001 | Health | GET | `/healthz` | `200`, request ID, security headers | `200`, `nosniff`, no `X-Powered-By` | PASS | No database needed. |
| API-002 | Health | GET | `/readyz` disconnected | `503` safe readiness body | `503`, `not_ready`, database `disconnected` | PASS | Real Atlas state remains unverified. |
| API-003 | Auth | POST | `/api/auth/register` missing/malformed body | `400` | `400` | PASS | No persistence. |
| API-004 | Auth | POST | `/api/auth/login` malformed email/short or >72-byte password | `400` | `400` | PASS | bcrypt input bound. |
| API-005 | Auth | GET | `/api/auth/me` without bearer token | `401` | `401` | PASS | |
| API-006 | Private routes | GET/POST | Profile, applications, AI endpoints without token | `401` | `401` | PASS | Auth middleware rejects before handler. |
| API-007 | CORS | GET | `/healthz` from disallowed origin | `403`, no allow-origin header | `403`, no allow-origin header | PASS | |
| API-008 | OpenAPI | GET | `/openapi.json` | `200`, OpenAPI 3 and actual route declarations | `200`; resource and AI paths present | PASS | Generated file also checked in. |
| API-009 | Swagger UI | GET | `/api-docs/` | `200` HTML and security headers | `200`, `nosniff` present | PASS | Scoped CSP removed for Swagger UI inline assets; other Helmet headers remain. |
| API-010 | HTTPS headers | GET | `/healthz` in production mode | HSTS and frame protection | HSTS present; `X-Frame-Options: SAMEORIGIN` | PASS | Header check only; no TLS server/deployment configured. |
| API-011 | Routing | GET | Unknown path | `404` safe body with request ID | `404`, no stack details | PASS | |
| API-012 | Parsing | POST | Malformed JSON | `400 Invalid JSON body` | `400`, parser internals not returned | PASS | |
| API-013 | Auth abuse | POST | Repeated `/api/auth/login` malformed attempts | `429` after configured limit | `429` observed | PASS | Process-local limiter. |
| API-014 | Auth | POST | `/api/auth/register` valid payload | `201`; bcrypt hash; no hash in response | `201`; hash differs from input; response omits hash | PASS | User methods mocked. |
| API-015 | Profile | GET/PATCH | Own profile | `200`; patch only whitelisted dotted fields | `200`; owner ID and `$set profile.fullName` asserted | PASS | User methods mocked. |
| API-016 | Applications | GET | List | `200`, filter and count scoped to token subject | `200`; both filters asserted | PASS | Application methods mocked. |
| API-017 | Applications | GET | Request another owner’s record | `404`, owner filter enforced | `404`; query includes token subject | PASS | Application method mocked. |
| API-018 | Applications | POST | Client tries to set `user` | `400`; owner cannot be overridden | `400`; no create call | PASS | Zod strict schema. |
| API-019 | Applications | POST | Valid record | `201`; authenticated user assigned | `201`; saved owner equals token subject | PASS | Database method mocked. |
| API-020 | Applications | PATCH/DELETE | Update/delete by ID | Success and owner filter | `200`/`204`; owner asserted | PASS | Database methods mocked. |
| API-021 | Applications | GET | Malformed ID | `400` before DB lookup | `400`; lookup stub not called | PASS | |
| API-022 | Resources | GET/POST/PATCH/DELETE | Skills, roadmaps, projects, interviews | CRUD success; every query owner-scoped | `200`/`201`/`200`/`204`; owner filters asserted | PASS | Database methods mocked. |
| API-023 | Resume | POST | `.txt` upload | `400` | `400`, PDF-only error | PASS | Auth user mocked. |
| API-024 | Resume | POST | Text named `.pdf` | `400`, remove rejected temp file | `400`; temp directory empty | PASS | Signature check verified. |
| API-025 | Resume | POST | Minimal PDF signature | `201`, random name and safe metadata | `201`; random UUID filename; no stored path returned | PASS | Database save mocked; temp file cleaned after test. |
| API-026 | Resume | DELETE | Own resume | `204` and remove stored file | `204`; temp directory empty | PASS | Database save mocked. |
| API-027 | AI | POST | Each of five AI-dependent endpoints | Authenticated `503`, no generated response | All five returned `503 AI functionality is currently unavailable` | PASS | AI service is explicitly inactive. |

## Security test cases

| Area | Result | Verification / limitation |
|---|---|---|
| Authentication and authorization | PASS (route logic) | Missing token rejects; valid mock token used; queries include authenticated owner. Live token/database flow awaits Atlas. |
| Password storage | PASS (unit route test) | bcrypt hash created; response excludes hash. |
| Rate limiting | PASS | Auth limiter returns `429`; in-memory store is single-process only. |
| Validation / injection | PASS (partial) | Zod strict auth/profile/application bodies, ObjectId format and bounded pagination; global Mongo operator sanitizer. Broader adversarial fuzzing remains. |
| CORS | PASS | Explicit allowlist; disallowed origin rejected; wildcard disabled. |
| Security headers | PASS | Helmet headers tested; HSTS only production mode. |
| File uploads | PASS (focused) | MIME/extension, size limit configured, signature checked, server-generated names, private storage; content parser/corruption validation beyond header not implemented. |
| Sensitive data exposure | PASS (focused) | Password hash and stored resume path omitted from auth/upload responses; generic errors omit stacks. No production logging/deployment audit performed. |
| Dependency vulnerabilities | PASS | `npm audit`: zero vulnerabilities after upgrading Multer to 2.5.0 and Zod to 4.6.7. |
| HTTPS | BLOCKED | No local certificate or deployment reverse proxy. Local HTTP is not HTTPS. |

## Thunder Client

Thunder Client was not run in the VS Code UI. This environment did not expose a working editor/Thunder control surface. The supported import source is [backend/openapi.json](/C:/Users/parth/OneDrive/Desktop/Nexora/backend/openapi.json). Thunder Client documentation says OpenAPI v3 JSON can be imported.

To import and run manually:

1. Configure the rotated Atlas URI and a 32+ character JWT secret in ignored `backend/.env`.
2. From `backend/`, run `npm start`; verify database readiness at `http://localhost:5000/readyz`.
3. In VS Code, open Thunder Client → Collection tab → menu → Import → select **OpenAPI** → choose `backend/openapi.json`.
4. Select the local base URL, register a disposable test account, use the returned bearer token for protected requests, then run successful and negative cases.
5. Share the exported run report; unexecuted Thunder Client tests remain blocked, not passed.

## Issues and pending tests

- Server startup was attempted but blocked by absent `JWT_SECRET`; no local `.env` exists. A replacement Mongo URI is also required.
- MongoDB Atlas connection and persistence tests are blocked. Do not use the password pasted earlier; rotate it first and keep replacement credentials local.
- Thunder Client runs are pending user/VS Code execution; importable OpenAPI file is prepared.
- Resume text extraction is not implemented; no PDF parser selected. Current file check verifies PDF signature, not full document structure.
- Production TLS and reverse-proxy redirect need a deployment target/certificate.
- Rate limiter needs shared storage for multi-process deployment.
- No complete account deletion/retention workflow exists yet.
- Remote `origin` is configured, but advertises no branches. First push and Git authentication are not yet verified.

## Results and work summary

- **Completed:** Express/Mongoose modular foundation, auth/profile/application routes, user-authored resource CRUD, private resume upload/delete, validation, security middleware, AI disabled responses, OpenAPI docs, tests and environment protections.
- **Automated checks passed:** 27 of 27 tests; `npm audit` reports 0 vulnerabilities; `npm run openapi` generated the static spec.
- **Failed checks:** Earlier draft test runs had test-mock mismatches and a masked expected 503; both were corrected. Final run has no failing test.
- **Blocked:** Live server startup, Atlas connection, Thunder Client, live multi-user ownership, production HTTPS, deployment-scale shared rate limiting, and remote push.
- **Not implemented:** AI/LLM, external APIs/datasets, generated analysis/recommendations, resume text extraction, frontend, deployment.

## Git commit and push history

| Commit # | Hash | Message | Date/time | Push status | Summary/tests |
|---|---|---|---|---|---|
| 1 | `02563db9bddf0323843a6882a9d5ad3824c722ae` | `feat(backend): add secure REST API foundation` | 2026-10-31 18:48 Asia/Kolkata | **Verified pushed** to `origin/master` | 47 project files; backend foundation, security, APIs, docs and 27-test suite. `npm run check` passed 27/27 and `npm audit` found 0 vulnerabilities before commit. Remote hash verified with `git ls-remote`. |
| 2 | `f8c723423a5cfe56cf0d5a143f8e479fa07007f1` | `docs: record verified backend push and decisions` | 2026-10-31 18:49 Asia/Kolkata | **Verified pushed** to `origin/master` | Recorded the first verified push, resolved AI decision, current setup choices and remaining blockers. Documentation-only; no source code changed. Remote hash verified with `git ls-remote`. |
