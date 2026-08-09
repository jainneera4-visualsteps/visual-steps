# Copilot Instructions

This is a full-stack educational platform for kids, built with React, Node.js (Express), and TypeScript. It features interactive learning, games, quizzes, social stories, and progress tracking, integrating AI capabilities, real-time communication, and a robust user authentication system.

## Key Technologies & Architecture:

*   **Frontend:** React 19, Vite, TypeScript, Tailwind CSS, Radix UI, Framer Motion, React Router DOM.
*   **Backend:** Node.js 20.x, Express, TypeScript, Socket.io, Multer, Nodemailer.
*   **Database/BaaS:** Supabase (`@supabase/supabase-js`).
*   **AI:** Google Gemini API (`@google/genai`).
*   **Authentication:** JWT, bcryptjs, Cookie-parser, custom `AuthContext`.
*   **Styling:** Tailwind CSS with `@radix-ui/react-tooltip` for accessible UI components.
*   **Build:** Vite (frontend), ESbuild/TSX (backend).

## Core Functionality:

*   **User Management:** Sign up, login, password reset, user profiles, role-based protected routes.
*   **Educational Content:** Activity Library, Social Stories, Quiz & Worksheet Generators (AI-powered).
*   **Interactive Games:** BrainQuest, Memory Game, Sorting Game, Even Odd, Polygon Hunt, Level Up.
*   **AI Concierge:** Chatbot for personalized assistance and content generation.
*   **Reporting:** Progress reports, summary reports (often generating PDFs with `jspdf`, `html2canvas`).
*   **Real-time Features:** Socket.io for potential live updates in games or chat.
*   **Media Handling:** File uploads (Multer) for images/avatars.

## Guidelines for Copilot:

*   **Language:** Always use TypeScript for both frontend and backend code.
*   **Frontend (src/):**
    *   **Components:** Leverage `src/components/` for reusable UI elements. Use Tailwind CSS for styling and `clsx`/`tailwind-merge` for conditional classes. Prioritize Radix UI components (`src/components/ui`) for accessibility.
    *   **State Management:** Use React Context API (`src/context/`) for global state like `AuthContext` and `WalkthroughContext`.
    *   **Routing:** Utilize `react-router-dom` and the `ProtectedRoute` components (`src/components/`) for navigation and access control.
    *   **API Calls:** Use `src/utils/api.ts` for structured API interactions.
    *   **Animations:** Favor `framer-motion` or `motion` for fluid UI animations.
    *   **Utilities:** Centralize common frontend utilities in `src/lib/utils.ts` and `src/utils/`.
*   **Backend (server.ts & related):**
    *   **API Endpoints:** Implement RESTful APIs using Express. Define routes and middleware for authentication (`jsonwebtoken`, `bcryptjs`).
    *   **Supabase:** Interact with Supabase via `src/lib/supabase.ts` for database operations.
    *   **AI Integration:** Use `@google/genai` via `src/lib/gemini.ts` for AI-driven features.
    *   **File Uploads:** Handle file uploads using `multer`.
    *   **Email:** Send emails with `nodemailer`.
    *   **Security:** Implement input validation, secure authentication practices, and error handling.
*   **Code Style:** Adhere to a consistent, readable, and maintainable code style. Prefer functional components with hooks in React.
*   **Documentation:** Add JSDoc comments for complex functions, components, and API endpoints.