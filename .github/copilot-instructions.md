# Copilot Instructions

This is a full-stack educational application built with **React 19**, **TypeScript**, and **Tailwind CSS** for the frontend, and **Express.js** with **Node.js 20.x** for the backend.

**Key Technologies & Patterns:**
*   **Frontend:** React (functional components, hooks, React Router v6), Tailwind CSS (utility-first styling), Radix UI (accessible components), Framer Motion (animations), Vite (build tool).
*   **Backend:** Express.js (REST API), Supabase (database, authentication), Google GenAI (`@google/genai`) for AI content generation (quizzes, social stories, worksheets), JWT & bcryptjs for authentication, Multer for file uploads, Socket.io for real-time features, Nodemailer for email.
*   **Architecture:** Client-server model, with the frontend consuming APIs from the Express backend. Supabase is used for backend storage and authentication.
*   **State Management:** React Context API (`AuthContext`, `WalkthroughContext`).
*   **File Structure Highlights:**
    *   `src/components`: Reusable UI components, modals, layout, protected routes.
    *   `src/context`: Global state management.
    *   `src/lib`: Core integrations (Gemini, Supabase) and general utilities.
    *   `src/pages`: Application views/screens.
    *   `src/utils`: Application-specific utility functions (API calls, auth helpers, date, rewards).

**When providing assistance:**
1.  **Prioritize TypeScript:** Ensure type safety, provide interfaces/types where appropriate.
2.  **Follow React best practices:** Functional components, hooks, clean JSX, `react-router-dom` for routing.
3.  **Adhere to Tailwind CSS:** Use utility classes for styling, avoid inline styles. Suggest combining classes with `clsx` and `tailwind-merge`.
4.  **Backend context:** Assume API endpoints are handled by Express, interacting with Supabase and Google GenAI.
5.  **Security:** Be mindful of authentication (JWT, bcryptjs), authorization (protected routes), and data validation.
6.  **Context awareness:** Leverage existing `AuthContext` and `WalkthroughContext` where relevant.
7.  **Module organization:** Suggest appropriate placement for new files within `src/components`, `src/pages`, `src/utils`, or `src/lib`.
8.  **Application Domain:** Focus on educational, child-centric features (quizzes, social stories, rewards, progress reports).