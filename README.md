# Visual Steps

Visual Steps is a full-stack web application that helps parents and caregivers create structured, visual routines and personalized learning experiences for children with autism. Parents manage profiles, activities, learning materials, progress, messages, and rewards; children receive a focused dashboard for completing activities, playing quizzes, chatting with a configured assistant, and redeeming earned rewards.

## What the application includes

### Parent experience

- Create and manage profiles for multiple children.
- Record each child's schedule, interests, strengths, support needs, therapies, rules, theme, time zone, and reward settings.
- Create reusable activity templates and assign visual, step-by-step activities.
- Schedule recurring activities and review completion history.
- Generate and edit AI-assisted quizzes, worksheets, and social stories.
- Assign quizzes and review results through progress and summary reports.
- Configure reward-shop items and approve purchases.
- Send messages to a child's dashboard.

### Child experience

- Sign in with a parent email and child access code.
- View current and completed activities in a child-friendly dashboard.
- Follow activity instructions with text, images, and links.
- Complete assigned quizzes and earn the configured tokens or stickers.
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

## Install on iPhone or iPad

Visual Steps is configured as a Progressive Web App (PWA). After deploying over HTTPS, open the site in Safari, tap **Share**, choose **Add to Home Screen**, and confirm **Add**. The installed icon launches Visual Steps in a standalone app-style window. API and Supabase operations still require a network connection; the service worker only provides the application shell and static assets during a temporary outage.

Run `npm run test:browser:mobile` to check install metadata, icons, public-page overflow, and phone navigation with iPhone and iPad WebKit emulation. These tests approximate Safari layouts but do not replace a final check on physical Apple devices.

## Authentication and data access

Parents authenticate through Supabase Auth. Protected browser API requests attach the Supabase access token. Children use a separate short-lived JWT session obtained by verifying their access code. API endpoints enforce ownership and role checks, while the Supabase schema also enables row-level security.

Uploaded files are stored in the local `uploads/` directory. Because ephemeral/serverless filesystems do not provide durable storage, production deployments should use persistent object storage for uploads.

## Deployment

`npm run build` creates the browser bundle and `dist/server.cjs`. `npm start` serves the production application on Node. The repository also contains `vercel.json`, which routes `/api/*` to `server.ts` and frontend paths to the single-page application.

Configure all required environment variables in the deployment platform. Use a strong `JWT_SECRET`, keep the Supabase service-role key private, and apply database changes through reviewed migrations before deploying application changes that depend on them.

## Product documentation

See [PRD.md](PRD.md) for the product goals, user journeys, implemented scope, requirements, and roadmap.
