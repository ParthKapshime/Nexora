# Nexora project decisions

## 2026-10-31

- The current frontend scaffold uses React, JavaScript, and Vite in accordance with the current `AGENTS.md` guidance.
- Frontend requests use the Express REST API. The browser must not connect directly to MongoDB or an AI provider.
- Keep the warm, light Nexora visual direction from `docs/references/nexora-ui-workflow-reference.png`, with reusable colors and responsive layouts.
- Do not present unsupported AI assessments, recommendations, interview feedback, or other generated content as real user results.
