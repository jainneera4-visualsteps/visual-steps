```markdown
# Project Guidelines for Copilot

This project is a full-stack educational application with a React frontend and an Express.js backend, both written in TypeScript.

## Core Technologies:
*   **Frontend:** React 19, TypeScript, Vite, Tailwind CSS (v4), React Router DOM (v6+), Radix UI (`@radix-ui/react-tooltip`), Framer Motion, Recharts, Socket.io-client.
*   **Backend:** Node.js 24.x, Express.js, TypeScript (`tsx` for dev/test, `esbuild` for build), Socket.io, Supabase client, Google Gemini AI client, bcryptjs, jsonwebtoken, multer, nodemailer, cookie-parser, cors.
*   **Database/Auth:** Supabase.
*   **AI:** Google Gemini.

## Project Structure & Conventions:
*   **Frontend (`src/`):**
    *   **`src/App.tsx`:** Main application entry point and routing configuration.
    *   **`src/components/`:** Contains reusable UI components (e.g., `Button`, `Card`, `Input`), including protected route wrappers (`ProtectedRoute`, `KidProtectedRoute`, `CommonProtectedRoute`).
    *   **`src/components/ui/`:** Specific UI primitives (e.g., `Tooltip`).
    *   **`src/pages/`:** Top-level page components (e.g., `Dashboard`, `CreateSocialStory`, `QuizGenerator`).
    *   **`src/context/`:** React Context APIs for global state management (`AuthContext`, `WalkthroughContext`).
    *   **`src/lib/`:** External service integrations (`gemini.ts`, `supabase.ts`) and global utility functions (`utils.ts`).
    *   **`src/utils/`:** Project-specific utility functions (`api.ts` for frontend API calls, `auth.ts`, `dateUtils.ts`, `rewardUtils.ts`).
*   **Backend (`server.ts`):**
    *   The entry point for the Express server.
    *   Handles API routes, user authentication, file uploads, email sending, and real-time communication via Socket.io.
    *   Interacts with the Supabase client for database operations and the Gemini client for AI tasks.
    *   Utilizes `dotenv` for environment variable management.

## Key Instructions for Copilot:
1.  **Language Preference:** Always prioritize TypeScript for type safety and code clarity.
2.  **React Components:**
    *   Develop functional React components using hooks (e.g., `useState`, `useEffect`, `useContext`).
    *   Adhere to established component patterns found in `src/components/`.
    *   Use `react-router-dom` (v6+) for all routing and navigation logic.
3.  **Styling:** Apply Tailwind CSS (v4) utility classes for all styling. Use `clsx` and `tailwind-merge` for managing conditional and conflicting classes.
4.  **Backend Development:**
    *   Implement Express.js routes and middleware consistent with existing patterns in `server.ts`.
    *   Handle authentication using `bcryptjs` for password hashing and `jsonwebtoken` for JWT generation/verification.
    *   Manage file uploads securely with `multer`.
    *   Integrate `socket.io` for real-time features as needed.
5.  **Supabase Integration:** Interact with Supabase for database operations, user authentication, and real-time subscriptions using the `@supabase/supabase-js` client (initialized in `src/lib/supabase.ts`).
6.  **Google Gemini AI:** Utilize the `@google/genai` client (initialized in `src/lib/gemini.ts`) for AI-powered content generation and other relevant AI tasks.
7.  **Code Reusability:** Leverage existing utility functions in `src/utils/` and `src/lib/` to ensure consistency, reduce redundancy, and maintain the project's coding standards.
8.  **Testing:** Unit tests are located in `tests/*.test.ts` and integration tests in `tests/integration/*.test.ts`, executed using `tsx --test`.
```