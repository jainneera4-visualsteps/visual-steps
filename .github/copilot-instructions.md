The project is a React 19 / Vite / TypeScript frontend with a Node.js 20 / Express / TypeScript backend, designed as an interactive educational platform for kids.

**Key Technologies:**

*   **Frontend:** React 19, TypeScript, Vite, Tailwind CSS (v4), `react-router-dom`, `framer-motion`, Radix UI, `lucide-react`, `recharts`, `html2canvas`, `jspdf`, `socket.io-client`. State managed via React Context API (`AuthContext`, `WalkthroughContext`).
*   **Backend:** Node.js 20, Express, TypeScript, `socket.io`, `bcryptjs`, `jsonwebtoken`, `cookie-parser`, `multer`, `nodemailer`, `cors`, `dotenv`.
*   **Database/Auth:** Supabase (`@supabase/supabase-js`).
*   **AI:** Google Gemini (`@google/genai`) for content generation (quizzes, social stories).

**Core Functionality:**

*   **Educational Content:** Generation and management of social stories, quizzes, and worksheets.
*   **User Management:** Parent/guardian and kid accounts with protected routes. Authentication, profile management, password recovery.
*   **Activities & Progress:** Assignment of activities, progress tracking, and reporting (`ProgressReport`, `SummaryReport`).
*   **Interactive Features:** Real-time communication (`socket.io`), rewards (`canvas-confetti`), image editing (`LayeredCanvasEditor`).
*   **AI Integration:** Leverage Gemini for dynamic educational content creation (`src/lib/gemini.ts`).

**Project Structure and Patterns:**

*   **`src/pages/`**: Top-level views and routes.
*   **`src/components/`**: Reusable UI components, including custom and Radix UI (`src/components/ui`).
*   **`src/context/`**: Global state management using React Context API.
*   **`src/lib/`**: External service integrations (Supabase, Gemini) and core utility functions.
*   **`src/utils/`**: Helper functions for API calls, authentication, date formatting, reward logic.
*   **`server.ts`**: Express backend entry point, handling API routes and WebSocket communication.
*   **Styling:** Utility-first CSS with Tailwind CSS (v4). Use `clsx` and `tailwind-merge` for conditional styling.

**Instructions for Copilot:**

1.  **Prioritize TypeScript:** Always provide type-safe code and interfaces.
2.  **React Best Practices:** Generate functional components, use hooks effectively, and adhere to existing component patterns.
3.  **Tailwind CSS:** Apply Tailwind utility classes for styling, following the project's existing design language. Avoid inline styles where possible.
4.  **Backend Development:** When working on `server.ts` or related files, ensure Express route conventions, proper error handling, and security considerations (e.g., JWT for auth, `bcryptjs` for passwords).
5.  **Supabase & Gemini Integration:** Understand and utilize the `src/lib/supabase.ts` and `src/lib/gemini.ts` helpers for database interactions and AI content generation, respectively.
6.  **Context API:** Leverage `src/context/AuthContext.tsx` and `src/context/WalkthroughContext.tsx` for global state management where appropriate.
7.  **File Organization:** Suggest or create files in their logical directories (`components`, `pages`, `utils`, `lib`, `context`).
8.  **Conciseness:** Provide clear, concise code snippets and explanations. Focus on completing the requested task without excessive boilerplate.
9.  **Security:** Be mindful of best practices for authentication, authorization, and data handling, especially concerning user data and AI prompts.