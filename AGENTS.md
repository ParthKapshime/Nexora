# Nexora Project Guidance

## Project identity and architecture

Nexora is an AI-powered career guidance and skill-development platform. Preserve the modular monolith architecture and existing repository conventions. Do not introduce microservices, paid APIs or services, or new technologies without a strong reason and explicit approval.

Ollama local LLM is the only AI provider. The Express backend communicates with Ollama. The frontend must communicate with the Express backend through REST APIs and must never connect directly to Ollama. Do not add Gemini or OpenAI API integrations, or silently fall back to a hosted model.

## Technology stack

### Frontend

- Next.js App Router
- React and TypeScript
- Tailwind CSS
- shadcn/ui as the primary component foundation
- Lucide React for icons
- Framer Motion for subtle animation
- React Hook Form and Zod for forms and validation
- Recharts for charts
- Axios for API requests

Avoid adding unnecessary UI libraries.

### Backend

- Node.js and Express.js
- MongoDB and Mongoose
- REST APIs
- JWT authentication
- bcrypt password hashing

## Design direction

Use the supplied Nexora dashboard reference image as the primary visual guidance when it is available. The design should be minimalist, modern, clean, professional, welcoming, and responsive. Use a light theme, warm off-white backgrounds, white cards with subtle borders, rounded corners, comfortable spacing, clear typography, and a strong visual hierarchy. Use restrained hover effects and transitions.

Avoid dark or navy backgrounds, excessive shadows, gradients, decorative clutter, and unnecessary animation. The interface should feel specific to Nexora rather than like a generic AI dashboard.

### Color tokens

Use reusable theme variables for these colors; do not create unrelated per-page variants:

- Main background: `#FFFCF7`
- Card background: `#FFFFFF`
- Powder blue: `#BFDDF2`
- Lavender: `#E5DDF7`
- Peach: `#F9DDCC`
- Muted text: `#77716D`
- Border: `#F0ECE7`
- Terracotta/rust: choose a consistent accent close to the supplied reference for primary actions, active navigation, progress bars, and important indicators.

## Official Frontend UI/UX Reference

**Official reference image:** `docs/references/nexora-ui-workflow-reference.png`

Treat this image as the primary visual reference for Nexora's frontend. Inspect it before implementing or modifying frontend pages. Maintain consistent typography, spacing, borders, card layouts, sidebar navigation, icons, button styles, and color palette. Follow the same minimalist, warm, light-themed visual direction, using terracotta accents, warm off-white backgrounds, white cards, and subtle borders. Maintain a consistent application header and sidebar across authenticated pages, and make every page responsive. Use reusable components and design tokens to maintain consistency. Do not independently introduce a different visual theme for individual modules. Do not copy the image as a flat background or use it as the actual application UI; recreate the interface using functional React components and CSS/Tailwind.

The image contains six screens; use each corresponding screen as the visual reference for its module:

1. Profile & Resume
2. Skills Analysis
3. Learning Roadmap
4. Project Recommendations
5. AI Mock Interview
6. Job Application Tracker

The Overview Dashboard should follow the same visual language as the other screens.

## Application shell and navigation

Authenticated dashboard pages should use a consistent application shell.

### Header

- Nexora logo/name on the left.
- Notification control.
- User profile/avatar menu.
- Subtle bottom border.

### Sidebar

Provide these primary destinations, each with an icon and label:

1. Overview
2. Profile
3. Skills
4. Learning
5. Projects
6. Interviews
7. Applications

Keep sidebar behavior and appearance consistent across authenticated pages. Highlight the active page with a soft terracotta background and accent text. On mobile, use an appropriate collapsible navigation or drawer.

### Main content

Give each page a clear title and short description. Use reusable cards, tables, badges, progress indicators, and forms with consistent spacing and alignment. Avoid overcrowding. Support responsive desktop, tablet, and mobile layouts.

## Required frontend pages and behavior

### Overview dashboard

Show a personalized greeting, current career goal, overall career-readiness percentage and progress bar, current learning priorities, weekly task progress, and quick navigation to important modules.

### Profile and resume

Provide a resume upload area with PDF support for the MVP; personal and education details; target job role; years of experience; resume upload and processing status; and a profile completion indicator. Use a clear multi-step form where appropriate.

### Skills analysis

Show the overall career-readiness score, skills grouped by category, existing strengths, missing or weak skills, skill gaps, and recommended next steps. Base analysis on available profile/resume information and the selected career goal. Never invent assessment results. Use charts and progress bars only when they improve understanding.

### Learning roadmap

Provide a personalized roadmap with weekly milestones, topics and skills to learn, recommended resources, task completion tracking, and overall roadmap progress. Allow users to mark tasks complete.

### Project recommendations

Show recommended portfolio projects with descriptions, required technologies, difficulty levels, and skills developed. Provide project detail pages and a meaningful action to add a project to the user's learning plan or portfolio.

### AI mock interviews

Support interview type, target role, and difficulty selection; AI-generated questions; answer submission; interview progress; feedback and evaluation after answers; and access to previous interview sessions. AI requests must follow the Ollama-through-Express boundary above.

### Job application tracker

Allow users to add and track company name, job title, application date, application status, next action/follow-up, and notes. Provide filters by status and an application progress overview. Possible statuses are Applied, Screening, Interview, Offer, and Rejected.

## End-to-end user workflow

Support this journey:

1. Register or log in.
2. Complete the profile.
3. Upload a resume.
4. Select a target job role.
5. Analyze existing skills.
6. Identify strengths and skill gaps.
7. Generate a personalized learning roadmap.
8. Explore recommended portfolio projects.
9. Practice through AI mock interviews.
10. Track job applications.
11. Return to Overview to monitor progress.

Navigation must let users move between modules without losing progress. Do not force users to complete every module before exploring the application.

## Component architecture and code quality

Build modular, reusable, typed components for the application header, sidebar navigation, dashboard cards, progress indicators, skill badges, forms and inputs, tables, status badges, empty states, loading states, error states, and confirmation dialogs.

Keep components maintainable. Separate UI from business logic and API communication, use reusable layout components, follow accessible UI practices, and use consistent form validation. Avoid unnecessary duplication and large components that contain all application logic.

## Functional implementation rules

- Every visible button must have a meaningful action, and navigation items must lead to their intended pages.
- Validate form input and show loading, success, and error feedback.
- Use realistic empty states when data is unavailable.
- Do not fake functionality or claim an operation succeeded when it did not.
- Do not hardcode AI-generated results as actual user data.
- Keep frontend API communication separate from UI components.
- The frontend calls the Express backend through REST APIs; only the backend accesses Ollama.
- Validate and authorize requests on the server. Hash passwords with bcrypt. Keep secrets out of source code, browser bundles, logs, and user-facing errors.
- Handle Ollama unavailability, timeouts, malformed responses, and model errors explicitly. Never silently change providers.

## Verification and change control

Inspect the repository, relevant documentation, and existing conventions before editing. Preserve existing technology decisions and working code. Do not overwrite unrelated files or make unnecessary rewrites. Follow the project's existing test, lint, and build commands; report only checks actually run and their results.

For documentation-only requests, do not implement pages or change application code. Treat the reference image as visual guidance and prioritize consistency, usability, and responsive behavior.


