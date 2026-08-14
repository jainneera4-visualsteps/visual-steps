This is a full-stack TypeScript application featuring a React 19 frontend and an Express 4 backend.

**Core Technologies:**
*   **Frontend:** React 19, React Router v7, Tailwind CSS (with Radix UI components), Framer Motion, Recharts.
*   **Backend:** Express 4, TypeScript (via `tsx`), Supabase SDK, `@google/genai` (Gemini API), Socket.IO, `bcryptjs`, `jsonwebtoken`, `multer`, `nodemailer`.
*   **Database/Auth:** Supabase.

**Project Purpose:**
An educational platform designed for parents and kids, facilitating activity management, social story creation, quiz and worksheet generation, progress tracking, and a reward system. It leverages AI (Google Gemini) for content generation and includes real-time communication via Socket.IO.

**Key Features:**
*   User authentication (parent/kid roles) with protected routes.
*   AI-powered generation of quizzes, worksheets, and social stories (`src/lib/gemini.ts`).
*   Activity library and assignment for kids.
*   Progress reporting and summary.
*   Real-time interactions via Socket.IO.
*   File uploads (`multer`), email notifications (`nodemailer`).

**Code Structure & Conventions:**
*   **`src/`:** Contains all client-side and server-side TypeScript source code.
*   **`src/components/`:** Reusable React UI components, including protected route wrappers (`ProtectedRoute`, `KidProtectedRoute`).
*   **`src/pages/`:** Top-level application views and routes.
*   **`src/context/`:** React Context API for global state management (e.g., `AuthContext`, `WalkthroughContext`).
*   **`src/lib/`:** Integrations with external services (Gemini, Supabase) and core utility functions.
*   **`src/utils/`:** Application-specific utility functions (e.g., `api.ts`, `auth.ts`, `rewardUtils.ts`).
*   **Styling:** Primarily Tailwind CSS. Use `clsx` and `tailwind-merge` for conditional and combined styles.
*   **Backend Entry:** The main backend entry is `server.ts` (used by `tsx` for dev, `esbuild` for build).
*   **Frontend Entry:** The main frontend entry is `main.tsx`.

**When providing suggestions or completing code:**
*   Prioritize TypeScript safety and best practices.
*   Adhere to Tailwind CSS for styling and component composition.
*   Consider the dual parent/kid user roles and corresponding access controls.
*   Leverage existing `src/lib/` and `src/utils/` modules for common tasks (API calls, auth, Supabase, Gemini).
*   Assume the context of an educational application with a focus on user experience and content generation.