# Copilot Instructions for Visual Steps

## Project Overview

Visual Steps is a child-focused learning and behavior support web app for parents, therapists, and caregivers. The product combines activity assignment, progress tracking, reward systems, social stories, quizzes, worksheets, and gamified learning experiences for kids. The UI is built around a warm, child-friendly experience, while the parent dashboard provides management and analytics tools.

## Tech Stack

- Frontend: React 19 with TypeScript
- Routing: React Router DOM v7
- Build tooling: Vite 6
- Styling: Tailwind CSS 4 with utility classes and custom component wrappers
- UI components: Radix UI Tooltip, Framer Motion / Motion, Lucide React
- Backend: Express.js server running in TypeScript/ESM
- Real-time: Socket.IO for live updates and room-based events
- AI features: Google Gemini via @google/genai
- Authentication & data: Supabase JS client and server-side Supabase integration
- File uploads: Multer + local uploads directory
- Other utilities: JWT, bcryptjs, nodemailer, cookie-parser, uuid

## Repository Structure

- src/ - main React application
  - pages/ - route-level screens such as Dashboard, KidsDashboard, ActivityLibrary, QuizGenerator, SocialStories, Games, and report pages
  - components/ - reusable UI blocks such as Layout, Button, Card, Input, Select, Textarea, Layout, and modal components
  - context/ - React context providers for auth and walkthrough state
  - lib/ - shared services like Supabase client, Gemini AI helpers, and utility integrations
  - utils/ - helper modules for auth, API requests, rewards, dates, and other shared logic
- server.ts - Express backend entrypoint with API routes, auth middleware, Supabase helpers, uploads, and Socket.IO setup
- uploads/ - local storage for uploaded images/files
- root scripts and config files - package.json, tsconfig.json, vite.config.ts, vercel.json
- migration and inspection scripts at the repo root - these are utility scripts for database and schema work and should be treated as support tooling

## Backend and Database Conventions

- The backend runs through Express in server.ts and exposes REST-style API endpoints under /api/.
- Supabase is the primary data backend. The client is initialized in src/lib/supabase.ts for the frontend and in server.ts for server-side calls.
- Authentication is handled through Supabase auth on the client, and the backend uses bearer tokens or cookie-based JWT-style session handling for protected routes.
- The app often uses fallback logic for offline/placeholder environments. If Supabase credentials are missing, code should degrade gracefully rather than crashing the UI.
- File uploads are stored locally in uploads/ and served statically from /uploads.
- Socket.IO is used for real-time updates; components often join rooms for a specific kid and refresh data when data_updated events arrive.

## Frontend Development Patterns

- Prefer functional React components and hooks.
- Keep page-level logic in the page components under src/pages and place reusable UI in src/components.
- Follow existing naming conventions: PascalCase for components and files, camelCase for variables/functions, and descriptive names for state and handlers.
- When adding a new feature, mirror the structure of existing pages and reuse shared utilities from src/utils and src/lib rather than duplicating logic.
- Use the existing shared API wrapper: apiFetch and safeJson from src/utils/api.ts for network requests.
- Favor the existing UI patterns:
  - use Button, Card, Input, Select, Textarea, and layout wrappers from src/components for consistency
  - use Tailwind utility classes for styling
  - keep child-friendly visual design and accessible, readable interfaces
- When working with async data, prefer loading states, graceful fallbacks, and defensive parsing to handle inconsistent API payloads.
- Keep local storage usage cautious and resilient; many screens implement safe localStorage helpers to avoid failures from quota or browser restrictions.

## Code Style Guidelines

- TypeScript should be used whenever possible; keep types explicit for new interfaces and props.
- Preserve the project’s tolerant error-handling style: log helpful warnings and continue gracefully when optional data is unavailable.
- Avoid introducing unnecessary dependencies unless the feature clearly requires them.
- Follow existing patterns for route protection and auth-aware views using ProtectedRoute and KidProtectedRoute.
- Respect the app’s domain model: kids, activities, quizzes, worksheets, social stories, rewards, and parent messages are core entities.

## Working Recommendations

- Before making changes, inspect the relevant page/component and nearby utilities to match existing patterns.
- When editing UI, preserve the current visual tone and avoid making the app feel overly corporate or generic.
- For new backend routes, keep them under the existing /api namespace and integrate with the existing Supabase helpers.
- For AI-related features, keep prompt logic and model selection centralized in src/lib/gemini.ts when possible.
- When working with forms, prefer existing input components and controlled state patterns already used in the current pages.

## Validation

- Run the typecheck/lint step when making significant changes:
  - npm run lint
- If you modify backend or API behavior, also verify the app still starts locally with:
  - npm run dev
