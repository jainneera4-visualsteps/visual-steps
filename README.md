# Visual Steps

Visual Steps is a full-stack web application that helps parents and caregivers create structured, visual routines and personalized learning experiences for children with autism. Parents manage profiles, activities, learning materials, progress, messages, and rewards; children receive a focused dashboard for completing activities, playing assigned quizzes, and redeeming earned rewards.

## What the application includes

### Parent experience

- Create and manage profiles for multiple children.
- Record each child's schedule, interests, strengths, support needs, therapies, rules, theme, time zone, and reward settings.
- Create reusable activity templates and assign visual, step-by-step activities.
- Follow a friendly first-time parent onboarding tour or replay it anytime from the dashboard.
- Ask the parent-only AI assistant how to use Visual Steps, summarize owned child data, or suggest relevant activities within a strictly app-related scope. Its verified catalog covers every registered app route; parents can view that coverage and report missing information for review without automatically training the model.
- Control AI spending with an atomic 30-question daily allowance per parent, including visible remaining usage and reset information.
- Schedule recurring activities, optionally require parent verification, and review completion history.
- Let parents type why a positive behavior deserves a limited bonus, with optional suggestions. The child dashboard shows a profile-configurable number of recent bonuses as compact reason-and-amount entries, and children cannot request them.
- Generate and edit AI-assisted quizzes, worksheets, and social stories.
- Assign quizzes for one attempt per activity occurrence and review results through progress and summary reports. A deliberate reassignment unlocks one new attempt without deleting earlier results.
- Configure reward-shop items and approve purchases.
- Send messages to a child's dashboard.

### Child experience

- Sign in with a parent email and child access code.
- View current, waiting-for-verification, and completed activities in a child-friendly dashboard.
- Follow activity instructions with text, images, and links.
- Receive small, reduced-motion-aware celebrations for correct quiz answers and meaningful completions.
- Submit assigned work and earn configured tokens or stickers only after the completion requirements are satisfied.

For activities marked **Parent verification required**, a child submission moves to a waiting queue. It does not update completion totals or rewards until the parent selects **Verify & complete**. A parent can instead reassign it to pending without granting a reward. Existing activities default to immediate completion.
- Read assigned social stories and messages from a parent.
- Spend earned rewards in the reward shop.

Real-time Socket.IO events keep the parent and child experiences synchronized when the application runs as a persistent Node server. Vercel uses a no-op Socket.IO fallback, so clients rely on subsequent API refreshes there.

## Technology

- React 19, TypeScript, React Router, and Vite
- Tailwind CSS 4, Lucide icons, Framer Motion, and Recharts
- Express and Socket.IO
- Supabase Auth and PostgreSQL with row-level security
- Google Gemini through `@google/genai`
- jsPDF and html2canvas for printable/exportable resources
- Vercel-compatible build and routing configuration

## Project structure

```text
src/
  components/       Shared UI, layout, editors, chat, and route guards
  constants/        Product and AI-assistant guidance
  context/          Authentication and walkthrough state
  lib/              Supabase, Gemini, and shared helpers
  pages/            Parent pages, child dashboard, generators, reports, and quizzes
  utils/            API, authentication, date/time-zone, and reward helpers
server.ts            Express API, authentication, data access, AI, uploads, and sockets
setup_database.sql   Destructive clean-install Supabase schema
vercel.json          Vercel build and rewrite configuration
```

## Prerequisites

- Node.js 24
- A Supabase project
- A Google Gemini API key
- Optional SMTP credentials for welcome and password-related email

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and set at least:

   ```dotenv
   GEMINI_API_KEY=your_gemini_api_key
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your_supabase_key
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   JWT_SECRET=replace_with_a_long_random_secret
   ```

   `SUPABASE_URL` and `VITE_SUPABASE_URL` must refer to the same project. Keep `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, Gemini credentials, and SMTP credentials server-side; never expose them through a `VITE_` variable.

3. Initialize a **new or disposable** Supabase database with `setup_database.sql` using the Supabase SQL editor.

   > Warning: `setup_database.sql` drops existing Visual Steps tables before recreating them. Do not run it on a database containing data you need to preserve. Existing installations should use reviewed, targeted migrations instead.

4. Start the application:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000`.

The development command runs `server.ts`; Express serves the API and delegates frontend development assets to Vite.

### Password recovery configuration

Parent password recovery uses Supabase Auth email links instead of security questions. In Supabase, open **Authentication → URL Configuration** and configure:

- Site URL: your production Visual Steps URL.
- Redirect URL: `https://visual-steps-six.vercel.app/forgot-password?mode=recovery`.
- Local redirect URL: `http://localhost:3000/forgot-password?mode=recovery` while testing locally.

Supabase sends the reset-link email, so configure Supabase Auth SMTP for reliable production delivery. The application SMTP variables continue to send Visual Steps welcome and password-change confirmation messages.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes | Server-only AI content generation; never expose this value with a `VITE_` prefix |
| `GOOGLE_API_KEY` | No | Fallback name for the Gemini key |
| `SUPABASE_URL` | Yes | Server-side Supabase project URL |
| `SUPABASE_KEY` | Yes | Server Supabase key/fallback key |
| `VITE_SUPABASE_URL` | Yes | Browser-side Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Browser-safe Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Recommended | Administrative operations that must bypass RLS |
| `JWT_SECRET` | Yes in production | Signs child-session tokens; the development fallback is not production-safe |
| `APP_URL` | Deployment-dependent | Public application URL used in generated links and emails; production uses `https://visual-steps-six.vercel.app` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional | Email delivery |

See `.env.example` for the complete template.

For the Vercel Production environment, set `APP_URL` to `https://visual-steps-six.vercel.app`. Local development can use `http://localhost:3000`. When the production domain changes, update `APP_URL` in Vercel and the Supabase Authentication Site URL/redirect allow list, then redeploy.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Run the Express and Vite development server |
| `npm run lint` | Run TypeScript checking with no emitted files |
| `npm test` | Run fast unit tests without external services |
| `npm run test:integration` | Run guarded Supabase integration tests against a disposable test project |
| `npm run test:api` | Run authenticated HTTP API tests against the disposable Supabase project |
| `npm run test:api:mocked` | Run local HTTP API tests with mocked external AI calls and no database writes |
| `npm run test:browser:ai` | Run the quiz and AI-image browser flow with mocked authentication and AI responses |
| `npm run test:gemini:smoke` | Run the optional, explicitly enabled one-request Gemini text smoke test |
| `npm run test:browser` | Run headless Phase 1 Playwright browser tests with mocked API responses |
| `npm run test:browser:mobile` | Run PWA and responsive-layout tests using iPhone and iPad WebKit emulation |
| `npm run test:browser:ui` | Open Playwright's interactive browser-test runner |
| `npm run test:all` | Run TypeScript checks, unit tests, and the production build |
| `npm run build` | Build the Vite client and bundle the Express server |
| `npm start` | Run the production server from `dist/server.cjs` |
| `npm run preview` | Preview the Vite client build |

### Supabase integration tests

Integration tests create and delete authentication users and database records. Never point them at the production project. Create `.env.test.local` with credentials for a disposable Supabase project whose Visual Steps schema has already been applied:

```env
SUPABASE_TEST_URL=https://your-test-project.supabase.co
SUPABASE_TEST_ANON_KEY=your-test-anon-key
SUPABASE_TEST_SERVICE_ROLE_KEY=your-test-service-role-key
SUPABASE_TEST_ALLOW_WRITES=true
```

Run `npm run test:integration` for direct database/RLS coverage or `npm run test:api` for the complete HTTP, authentication middleware, API handler, and database path. The suites refuse to start when a credential is missing, writes have not been explicitly enabled, or the test URL matches `SUPABASE_URL`/`VITE_SUPABASE_URL`. They create uniquely named fixtures and remove the test users afterward. Integration tests are intentionally separate from `test:all`, so normal builds do not require database secrets.

Run `npm run test:api:mocked` for the safe default API checks. This suite starts the real Express application on a temporary local port, uses in-memory AI responses, and never writes to Supabase or calls Gemini. It is included in `npm run test:all`.

Phase 1 browser tests do not require Supabase. Run `npm run test:browser` to start an isolated Vite server and exercise public navigation, login and signup forms, protected-route redirects, mocked kid lookup and password recovery, responsive layout, and browser console health. Playwright stores failure screenshots, videos, and traces in ignored local report directories.

### Optional Gemini smoke test

The real Gemini smoke test is excluded from `npm test` and `npm run test:all`. It makes exactly one short text-generation request, does not generate an image, and never prints the API key or full model response. With `GEMINI_API_KEY` configured in `.env`, run it only when you intentionally want to verify the live Gemini connection:

```bash
RUN_GEMINI_SMOKE_TEST=true npm run test:gemini:smoke
```

Without `RUN_GEMINI_SMOKE_TEST=true`, the test is safely skipped.

## Install on iPhone or iPad

Visual Steps is configured as a Progressive Web App (PWA). After deploying over HTTPS, open the site in Safari, tap **Share**, choose **Add to Home Screen**, and confirm **Add**. The installed icon launches Visual Steps in a standalone app-style window. API and Supabase operations still require a network connection; the service worker only provides the application shell and static assets during a temporary outage.

Run `npm run test:browser:mobile` to check install metadata, icons, public-page overflow, and phone navigation with iPhone and iPad WebKit emulation. These tests approximate Safari layouts but do not replace a final check on physical Apple devices.

## Authentication and data access

Parents authenticate through Supabase Auth. Protected browser API requests attach the Supabase access token. Children use a separate short-lived JWT session obtained by verifying their access code. API endpoints enforce ownership and role checks, while the Supabase schema also enables row-level security.

The public `/demo` route provides a database-free product tour. Its sample activities, verification decisions, reward balance, and behavior bonuses live only in React memory. It does not create an account, call protected APIs, or use browser storage, so refreshing or leaving the page restores the original sample data.

The guest demo and authenticated Quizzes, Worksheets, and Social Stories pages also expose the same curated sample content. These examples are bundled with the application, do not consume Gemini requests, and are never inserted into a parent's saved records.

Uploaded files are stored in the local `uploads/` directory. Because ephemeral/serverless filesystems do not provide durable storage, production deployments should use persistent object storage for uploads.

## Deployment

`npm run build` creates the browser bundle and `dist/server.cjs`. `npm start` serves the production application on Node. The repository also contains `vercel.json`, which routes `/api/*` to `server.ts` and frontend paths to the single-page application.

Configure all required environment variables in the deployment platform. Use a strong `JWT_SECRET`, keep the Supabase service-role key private, and apply database changes through reviewed migrations before deploying application changes that depend on them.

## Product documentation

See [PRD.md](PRD.md) for the product goals, user journeys, implemented scope, requirements, and roadmap.

<!-- FEATURE_REGISTRY:START -->
## Synchronized feature registry

This section is generated from `feature-registry.json`. Update the registry when a feature is added, changed, or removed; normal lint, test, development, and build commands refresh this table.

| Feature | Plan | Introduced | Current description |
| --- | --- | --- | --- |
| Clear visual activities | starter | 2026-03-01 | Build scheduled routines with small, image-supported steps children can follow. |
| Parent activity verification | starter | 2026-08-20 | Choose which activities require parent approval before rewards are earned. |
| Positive behavior bonuses | starter | 2026-08-20 | Parents can recognize a specific calm, focused, helpful, or persistent behavior. |
| Fair quiz attempts | starter | 2026-08-20 | Each assigned quiz allows one submitted attempt until a parent deliberately reassigns it. |
| Curated learning samples | starter | 2026-08-21 | Preview a quiz, printable worksheet, and social story without using AI or saving data. |
| Replayable parent tour | starter | 2026-08-20 | New parents receive a guided introduction, and existing parents can replay it anytime. |
| Visual Steps Parent Assistant | family | 2026-08-20 | Ask app how-to questions and receive answers grounded in owned family data. |
| Controlled social-story sharing | family | 2026-08-19 | Share a story using a private link that can expire or be revoked. |
| Temporary guest demonstration | starter | 2026-08-21 | Explore realistic parent and child workflows without an account or database writes. |
| Learning, progress, and meaningful rewards | starter | 2026-03-15 | Create personalized resources, understand progress, and connect earned rewards to meaningful goals. |
| Visual Steps Weekly | starter | 2026-08-21 | Read a Monday update archive on the website or receive confirmed issues by email. |
<!-- FEATURE_REGISTRY:END -->
