This is a full-stack educational web application built with React 19, TypeScript, Vite, and Tailwind CSS on the frontend, and an Express.js server on Node.js 24 for the backend. It integrates with Supabase for data storage and authentication, and the Google Gemini API for AI-powered content generation.

**Project Goal:**
The application facilitates parents/teachers in managing and generating educational content (quizzes, worksheets, social stories) for children. Key features include activity assignment, progress tracking, user authentication with distinct roles (parent/teacher, kid), and real-time communication.

**Key Technologies & Libraries:**
*   **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, React Router DOM v7, Radix UI (Tooltip), Framer Motion, Recharts, React Markdown, Lucide React, Socket.io-client.
*   **Backend:** Express.js, TypeScript, Node.js 24, Socket.io, Supabase SDK, Google Gemini API SDK, bcryptjs (password hashing), jsonwebtoken (authentication), multer (file uploads), nodemailer (email).
*   **Database/Auth:** Supabase.

**Codebase Structure & Conventions:**
*   **Client-Server Architecture:** `src/` contains both client-side React code and server-side logic (e.g., `server.ts` for Express and Socket.io).
*   **Frontend:**
    *   `src/pages/`: Top-level views/routes.
    *   `src/components/`: Reusable UI components. `src/components/ui/` for Shadcn-like primitives.
    *   `src/context/`: React Context for global state (e.g., `AuthContext`, `WalkthroughContext`).
    *   `src/lib/`: Integrations with external services (e.g., `gemini.ts`, `supabase.ts`) and core utilities.
    *   `src/utils/`: Utility functions (e.g., `api.ts` for client-side API calls, `auth.ts`, `rewardUtils.ts`).
*   **Styling:** Primarily uses Tailwind CSS for utility-first styling. Refer to `tailwind.config.ts` for custom configurations.
*   **Type Safety:** Strict TypeScript is enforced throughout the project.
*   **User Roles:** Be aware of the `KidProtectedRoute` and `CommonProtectedRoute` components, indicating distinct user experiences and access levels for children and parents/teachers.
*   **AI Integration:** The `src/lib/gemini.ts` module handles interactions with the Google Gemini API for generating educational content.
*   **Build Process:** Vite for client build, esbuild for server build.

**Copilot Instructions:**
*   Prioritize TypeScript for all code generation, ensuring type correctness and explicitness.
*   Adhere to existing React component patterns, functional components, and Hooks.
*   Utilize Tailwind CSS classes for styling wherever possible, following existing conventions.
*   Understand the distinction between parent/teacher and child user roles and their respective features (e.g., `QuizGenerator` vs. `PlayQuiz`).
*   Be familiar with Supabase client interactions for data fetching and mutations.
*   Leverage the Google Gemini API via `src/lib/gemini.ts` for AI-related tasks.
*   For server-side changes, consider the Express framework, Socket.io, and middleware like `multer` or `jsonwebtoken`.
*   Maintain a clear separation of concerns, especially between UI, business logic, and API interactions.
*   Consult `package.json` for available scripts (`dev`, `build`, `start`, `test`).