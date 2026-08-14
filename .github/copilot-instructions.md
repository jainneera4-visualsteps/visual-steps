# Project: Educational Platform (React, Node.js, Supabase, GenAI)

This is a full-stack educational application designed for kids and educators, featuring AI-powered content generation, interactive learning tools, and progress tracking.

## Core Technologies

*   **Frontend**: React 19, TypeScript, Vite, Tailwind CSS (v4), Radix UI, Framer Motion, React Router DOM.
*   **Backend**: Node.js 20, Express, TypeScript, Socket.io.
*   **Database/Auth**: Supabase.
*   **AI**: Google GenAI (`@google/genai`).
*   **Utilities**: `bcryptjs`, `jsonwebtoken`, `multer`, `nodemailer`, `html2canvas`, `jspdf`, `recharts`.

## Key Features & Domains

*   **AI Content Generation**: Quizzes, Social Stories, Worksheets (via Google GenAI - see `src/lib/gemini.ts`).
*   **User Management**: Authentication (parents/educators, kids), protected routes, profile management.
*   **Interactive Tools**: Canvas editor (`LayeredCanvasEditor`), emoji picker, reporting.
*   **Real-time**: Live interactions/updates via Socket.io.
*   **Data Management**: Supabase integration (`src/lib/supabase.ts`), API utilities (`src/utils/api.ts`).

## Codebase Structure & Conventions

*   **`src/pages/`**: Primary application views (e.g., Dashboard, QuizGenerator, SocialStories).
*   **`src/components/`**: Reusable React UI components. `src/components/ui/` for Radix-based primitives.
*   **`src/context/`**: React Contexts for global state (`AuthContext`, `WalkthroughContext`).
*   **`src/lib/`**: External service integrations and core utilities (`gemini.ts`, `supabase.ts`, general `utils.ts`).
*   **`src/utils/`**: Application-specific helpers (`api.ts`, `auth.ts`, `dateUtils.ts`, `rewardUtils.ts`).
*   **Styling**: Primarily Tailwind CSS v4. Ensure classes adhere to Tailwind conventions.
*   **TypeScript**: All code is strictly typed. Prioritize type safety.
*   **React**: Use functional components and hooks. Follow modern React best practices.

## Copilot Guidance

*   **Prioritize Type Safety**: Always infer or explicitly define types for functions, props, and state.
*   **Tailwind CSS**: Suggest idiomatic Tailwind classes for styling based on component purpose and existing patterns.
*   **Contextual Awareness**: Understand `AuthContext` for user roles and `WalkthroughContext` for onboarding states.
*   **Supabase & API**: For data operations, refer to patterns in `src/lib/supabase.ts` and `src/utils/api.ts`.
*   **AI Integration**: When working on generative features, consult `src/lib/gemini.ts` for interaction patterns.
*   **Protected Routes**: Be aware of `ProtectedRoute`, `CommonProtectedRoute`, `KidProtectedRoute` for access control logic.
*   **Backend/Frontend Split**: `server.ts` handles the Express backend logic and API, while `src/` is the React frontend.