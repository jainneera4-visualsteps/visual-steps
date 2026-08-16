# Copilot Instructions for this React/Node.js Educational App

This is a full-stack TypeScript project for an educational application, primarily targeting children, parents, and educators. It features a React 19 frontend with Vite, Tailwind CSS (v4), and Radix UI, an Express.js backend running on Node.js 24.x, and integrates with Supabase for data management and Google Gemini for AI-generated content.

## Key Technologies & Architecture:

*   **Frontend:** React 19, Vite, TypeScript, Tailwind CSS (v4), Radix UI, Framer Motion. Uses React Router DOM for navigation and React Context for global state (AuthContext, WalkthroughContext).
*   **Backend:** Node.js 24.x, Express.js, TypeScript. Handles API requests, authentication (JWT, bcryptjs), file uploads (Multer), email (Nodemailer), and real-time communication (Socket.IO).
*   **Database/Auth:** Supabase integration via `@supabase/supabase-js`.
*   **AI/Generative:** Google Gemini via `@google/genai` for content generation (quizzes, social stories, worksheets).
*   **Testing:** Playwright for browser-based UI tests, TSX for server-side unit/integration tests.
*   **Build:** Vite for client, esbuild for server.

## Core Functionality & Domains:

*   **User Management:** Authentication (signup, login, password reset), user profiles (parents/educators) and kid profiles.
*   **Content Generation:** AI-powered creation of quizzes, social stories, and worksheets.
*   **Activity Management:** Assigning and tracking activities for kids.
*   **Reporting:** Progress reports and summary reports for kids' activities.
*   **Real-time:** Live interactions and updates using Socket.IO.
*   **Media & Export:** File uploads, PDF generation (html2canvas, jspdf).

## Guidelines for Copilot:

*   **Frontend Tasks:** When working on React components (`src/components`, `src/pages`), prioritize functional components, React Hooks, and apply Tailwind CSS for styling. Utilize Radix UI for accessible UI primitives and Framer Motion/Motion for animations.
*   **Backend Tasks:** For server-side code (`server.ts` or related utilities), adhere to Express.js conventions, ensure type safety with TypeScript, and properly handle API routes, authentication, and database interactions (Supabase).
*   **AI Integration:** When generating content, remember to interact with the `@google/genai` library via `src/lib/gemini.ts`.
*   **Security:** Be mindful of security best practices, especially concerning authentication (JWT, bcryptjs), data validation, and environment variables (`dotenv`).
*   **File Structure:** Maintain the existing logical separation between components, pages, contexts, libraries, and utilities.
*   **Testing:** If asked to generate tests, use Playwright for browser tests and TSX with built-in Node.js test runner for unit/integration tests.
*   **Node.js Version:** Assume Node.js v24.x runtime environment.
*   **Conciseness:** Provide clear, concise, and idiomatic TypeScript code for both frontend and backend.