This project is a full-stack educational platform for children, built with React 19, TypeScript, and Vite for the frontend, and Node.js with Express for the backend. It integrates Supabase for database and authentication, and the Google Gemini API for AI-powered content generation (quizzes, social stories, worksheets).

**Key Technologies & Libraries:**

*   **Frontend:** React 19, TypeScript, Vite, React Router DOM v7, Tailwind CSS (v4), Radix UI (Tooltip), Framer Motion, Recharts.
*   **Backend:** Node.js 24, Express.js, TypeScript (running with `tsx`), Socket.io (real-time communication), bcryptjs (password hashing), jsonwebtoken (JWT auth), multer (file uploads), nodemailer (email).
*   **Database/Auth:** Supabase.
*   **AI:** Google Gemini API (`@google/genai`).
*   **Testing:** Playwright (browser E2E), TSX (unit/integration/API tests).
*   **Utilities:** `clsx`, `tailwind-merge`, `uuid`.

**Project Structure & Core Functionality:**

*   **`src/pages`**: Top-level components for different routes (e.g., Dashboard, Activity Library, Social Stories, Quiz/Worksheet Generators, Auth flows).
*   **`src/components`**: Reusable UI components, including protected routes (`ProtectedRoute`, `KidProtectedRoute`) and common elements.
*   **`src/context`**: Global state management (AuthContext, WalkthroughContext).
*   **`src/lib`**: Integrations with external services (Gemini API, Supabase).
*   **`src/utils`**: Helper functions for API calls, authentication, date formatting, rewards, etc.
*   **Backend (`server.ts`)**: Manages API endpoints, authentication, real-time events via Socket.io.
*   **Features:** User authentication (parents & kids), personalized dashboards, activity library, AI-generated social stories, quizzes, and worksheets, progress tracking, reward systems, real-time features.

**Copilot Focus Areas:**

*   **React Components:** Generate new components following existing patterns (TypeScript, Tailwind CSS, Radix UI where applicable). Ensure prop types are well-defined.
*   **API Interactions:** Assist in creating and modifying API calls using `src/utils/api.ts` patterns, handling request/response types.
*   **State Management:** Help with `AuthContext` and `WalkthroughContext` usage, or suggest local state management with React hooks.
*   **Backend Endpoints:** Develop new Express routes in `server.ts` for data retrieval, updates, and AI interactions, including authentication and validation.
*   **Supabase Operations:** Generate code for interacting with Supabase (CRUD operations, authentication flows).
*   **Gemini API Usage:** Create functions to interact with the Gemini API for content generation, adhering to prompt engineering best practices.
*   **Testing:** Generate Playwright E2E tests for new features and unit/integration tests using `tsx --test`.
*   **TypeScript Types:** Maintain strong typing across the codebase, especially for API payloads, component props, and state.
*   **Styling:** Leverage Tailwind CSS for utility-first styling. Prefer `clsx` and `tailwind-merge` for conditional styling.

**Guidelines:**

*   **TypeScript First:** Always prioritize explicit types.
*   **Functional Components:** Prefer functional React components with hooks.
*   **Tailwind CSS:** Use Tailwind for styling; avoid inline styles or custom CSS files unless necessary.
*   **Security:** Be mindful of authentication, authorization, and data validation, especially in backend code.
*   **Readability:** Write clear, concise, and well-commented code.
*   **Error Handling:** Implement robust error handling in both frontend and backend.