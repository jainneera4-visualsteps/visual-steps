```markdown
# Copilot Instructions

This project is an AI-powered educational platform designed for parents and children. It features an interactive React frontend with a robust Express.js backend, leveraging generative AI to create engaging learning content.

## Project Overview

*   **Purpose:** Provide an educational platform for creating, assigning, and tracking activities, quizzes, and social stories, with distinct experiences for parents and kids.
*   **Key Features:** User authentication (parent/kid roles), AI-driven content generation (quizzes, worksheets, social stories), activity library, progress reporting, real-time communication, and content management.

## Tech Stack

*   **Frontend:** React 19, TypeScript, Vite, Tailwind CSS (v4), Framer Motion, Radix UI, Lucide React, React Router DOM, Recharts, Socket.IO Client.
*   **Backend:** Node.js (v24.x), Express.js, TypeScript, Socket.IO, `jsonwebtoken`, `bcryptjs`, `multer`, `nodemailer`, `cookie-parser`.
*   **Database/BaaS:** Supabase (`@supabase/supabase-js`).
*   **AI:** Google GenAI (`@google/genai`) for content generation.
*   **Utilities:** `clsx`, `tailwind-merge`, `uuid`, `dotenv`, `canvas-confetti`, `html2canvas`, `jspdf`, `react-markdown`.
*   **Testing:** Playwright (E2E/Browser tests), `tsx --test` (Unit/API/Integration tests).

## Architecture & Code Structure

*   **Frontend (`src/`):** Organized into `components/` (reusable UI), `pages/` (route-specific views), `context/` (global state), `lib/` (external service integrations like `gemini.ts`, `supabase.ts`), `utils/` (helper functions), `constants/`.
*   **Backend (`server.ts`):** An Express.js server handling API routes, authentication, and Socket.IO real-time communication.
*   **Styling:** Predominantly Tailwind CSS. Use `clsx` and `tailwind-merge` for conditional and merged class names.
*   **Authentication:** JWT-based for parent/kid sessions, implemented via `utils/auth.ts` and Express middleware.
*   **Generative AI:** Integrated through `lib/gemini.ts` for dynamic content creation.

## Copilot Directives

1.  **Adhere to TypeScript:** Ensure strong typing and leverage TypeScript features for robust code.
2.  **Maintain Component Structure:** Follow existing React functional component patterns, prop typing, and hooks usage.
3.  **Tailwind CSS First:** Prioritize utility-first CSS using Tailwind classes for styling. When creating new components, ensure they are styled consistently.
4.  **Security & Best Practices:** For authentication and API interactions, prioritize secure coding practices (e.g., input validation, error handling, proper JWT usage).
5.  **Supabase & Gemini Integration:** When interacting with Supabase or Google GenAI, use the established patterns in `lib/supabase.ts` and `lib/gemini.ts`.
6.  **Code Consistency:** Match the existing naming conventions, file structure, and coding style (e.g., arrow functions, destructuring).
7.  **Test Generation:** For new features or bug fixes, suggest relevant unit, integration, or Playwright tests, following existing test patterns in `tests/`.
8.  **Explain Complex Logic:** For non-trivial logic, provide concise comments or docstrings explaining the purpose and implementation.
9.  **Performance:** Be mindful of performance implications, especially in React components and API routes.
10. **Accessibility:** Consider accessibility when generating UI components, especially for interactive elements.
```