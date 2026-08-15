```markdown
The codebase is a full-stack TypeScript application for an educational platform.

**Core Technologies:**
*   **Frontend:** React 19, Vite, React Router DOM 7, Tailwind CSS 4, Framer Motion, Radix UI, Recharts, Socket.io-client.
*   **Backend:** Express 4, Socket.io, bcryptjs, jsonwebtoken, multer, nodemailer, cookie-parser, cors.
*   **Database/Auth:** Supabase (@supabase/supabase-js), JWT.
*   **AI:** Google Gemini (@google/genai) for content generation.
*   **Language:** TypeScript.
*   **Runtime:** Node.js 24.x.

**Project Structure & Key Responsibilities:**
*   **`src/App.tsx`, `src/main.tsx`:** Main React application entry points and routing.
*   **`server.ts`:** Express.js backend server, handling API routes, authentication, file uploads, email, and real-time communication via Socket.io.
*   **`src/pages/`:** Top-level React components representing different application views (e.g., Dashboard, ActivityLibrary, QuizGenerator, SocialStories, KidsDashboard, ProgressReport).
*   **`src/components/`:** Reusable React UI components, including protected routes (`ProtectedRoute.tsx`, `KidProtectedRoute.tsx`), modals, and basic form elements. `src/components/ui` for Radix-style components (e.g., Tooltip).
*   **`src/context/`:** React Context API implementations for global state management (e.g., `AuthContext.tsx` for user authentication, `WalkthroughContext.tsx`).
*   **`src/lib/`:** Integration with external services and common utilities.
    *   `src/lib/gemini.ts`: Handles interactions with the Google Gemini AI API.
    *   `src/lib/supabase.ts`: Manages Supabase client setup and interactions.
    *   `src/lib/utils.ts`: General utility functions (e.g., `clsx`, `tailwind-merge`).
*   **`src/utils/`:** Client-side utility functions.
    *   `src/utils/api.ts`: Centralized functions for making API requests to the backend.
    *   `src/utils/auth.ts`: Frontend-specific authentication helpers.
    *   `src/utils/dateUtils.ts`, `src/utils/rewardUtils.ts`, `src/utils/parentMessageRetention.ts`: Domain-specific utility functions.
*   **Styling:** Utility-first approach with Tailwind CSS 4.
*   **Testing:** Unit and integration tests are written in TypeScript and executed with `tsx --test` (e.g., `npm test`, `npm run test:integration`, `npm run test:api`).

**Application Domain:**
The application serves as an educational platform with features for parents/educators and children. Key functionalities include:
*   User authentication and role-based access (parents, kids).
*   Activity management, social story creation/viewing.
*   AI-powered quiz and worksheet generation (via Gemini).
*   Progress tracking and reporting for kids.
*   Real-time interactions (implied by Socket.io).

**Key Patterns:**
*   Functional React components with hooks.
*   Context API for global state.
*   Centralized API interaction utilities.
*   Protected routes for access control.
*   Modular structure for pages and components.
*   Express.js middleware for request processing.
*   JWT for authentication.
```