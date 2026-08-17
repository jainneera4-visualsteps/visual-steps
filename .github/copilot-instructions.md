```markdown
As an expert React/TypeScript full-stack developer, assist with this project.

**Project Overview:**
This is a full-stack web application built with React 19, TypeScript, and Vite for the frontend, and an Express.js server on Node.js 24 for the backend. It leverages Supabase for authentication and database management, Google Gemini AI for content generation, and Socket.IO for real-time features. Styling is handled with Tailwind CSS and Radix UI components.

**Key Technologies & Libraries:**

*   **Frontend:** React 19, TypeScript, Vite, React Router DOM v7, Tailwind CSS (v4), Radix UI (Tooltip), Framer Motion, Lucide React, Recharts, Socket.IO-Client.
*   **Backend:** Node.js 24, Express.js, TypeScript, bcryptjs, jsonwebtoken, cookie-parser, multer (file uploads), nodemailer, Socket.IO.
*   **Database/Auth:** Supabase (@supabase/supabase-js).
*   **AI:** Google Gemini API (@google/genai).
*   **Utilities:** clsx, uuid, html2canvas, jspdf, canvas-confetti, emoji-picker-react.
*   **Testing:** Playwright (browser tests), tsx --test (unit/integration/API tests).

**Codebase Structure & Conventions:**

*   **`src/`:** Contains all client-side React application code.
    *   **`src/pages/`**: Top-level views and routes.
    *   **`src/components/`**: Reusable UI components. Includes `src/components/ui/` for styled primitive components (e.g., Radix Tooltip).
    *   **`src/context/`**: React Context API for global state management (e.g., `AuthContext`, `WalkthroughContext`).
    *   **`src/lib/`**: External service integrations (`gemini.ts`, `supabase.ts`) and core utilities (`utils.ts`).
    *   **`src/utils/`**: Application-specific utility functions (e.g., `api.ts` for API calls, `auth.ts` for client-side auth logic, `dateUtils.ts`, `rewardUtils.ts`).
    *   **`src/constants/`**: Application-wide constants.
*   **`server.ts`**: The main Express.js backend server entry point.
*   **TypeScript:** Strict TypeScript usage is enforced. Prioritize type safety and create interfaces/types as needed.
*   **Styling:** Use Tailwind CSS classes for styling components. Refer to `tailwind.config.ts` for custom configurations.
*   **API Communication:** Use `src/utils/api.ts` for centralized API calls to the Express backend.
*   **Authentication:** Leverage `AuthContext` on the frontend and JWT-based authentication on the backend with `jsonwebtoken` and `bcryptjs`. Supabase handles the actual user management.
*   **File Naming:** Components and pages follow PascalCase (e.g., `ActivityDetailModal.tsx`, `Dashboard.tsx`). Utilities and libs follow camelCase (e.g., `dateUtils.ts`).

**When generating code:**

*   **Prioritize existing patterns:** Look at surrounding code and similar files to understand the architectural patterns, component structure, and coding style.
*   **Type Safety:** Always aim for explicit types and interfaces for props, state, and function arguments/returns.
*   **Modularity:** Create small, focused components and utility functions.
*   **Performance:** Consider performance implications, especially for large lists or frequent updates.
*   **Testing:** Suggest or include basic test structures using Playwright for browser tests or `tsx --test` for unit/integration tests when appropriate.
*   **User Experience:** Keep the user flow and experience in mind, especially when suggesting UI components or interactions.

**Specific Areas of Focus:**

*   Developing new React components or pages.
*   Implementing new API endpoints or modifying existing ones in `server.ts`.
*   Integrating with Supabase for data operations or authentication.
*   Using Gemini AI for content generation tasks (e.g., `QuizGenerator`, `CreateSocialStory`).
*   Adding real-time features using Socket.IO.
*   Writing or updating tests.
*   Refactoring code for clarity, performance, or maintainability.
*   Ensuring consistent Tailwind CSS styling and responsiveness.
*   Working with state management via React hooks and Context API.
```