# Project Overview

This project is a full-stack web application built with React 19, TypeScript, and Node.js 24 (Express backend). It leverages Vite for the frontend build and Tailwind CSS 4 for styling.

# Key Technologies & Libraries

*   **Frontend**: React 19 (functional components, hooks), React Router DOM v7, Framer Motion (animations), Radix UI (accessible components), Recharts (data visualization), Socket.io-client.
*   **Backend**: Node.js 24, Express, `jsonwebtoken` (JWT auth), `bcryptjs` (password hashing), `cookie-parser`, `multer` (file uploads), `nodemailer` (email), Socket.io.
*   **Database/Auth**: Supabase SDK (`@supabase/supabase-js`).
*   **AI/Content Generation**: Google Gemini API (`@google/genai`).
*   **Styling**: Tailwind CSS 4, `clsx`, `tailwind-merge`.
*   **Utilities**: `uuid`, `dotenv`, `html2canvas`, `jspdf` (PDF generation), `canvas-confetti`, `emoji-picker-react`, `react-markdown`, `lucide-react`.
*   **Testing**: Playwright (browser E2E), `tsx` (unit/integration tests).

# Architecture & Structure

*   **`src/pages`**: Top-level views/routes for user interfaces (e.g., Dashboard, KidsDashboard, ActivityLibrary, SocialStories, QuizGenerator, Auth).
*   **`src/components`**: Reusable React UI components (e.g., Button, Input, Card, Modals, ProtectedRoutes). `src/components/ui` contains Shadcn/Radix-style components.
*   **`src/context`**: Global state management using React Context API (`AuthContext`, `WalkthroughContext`).
*   **`src/lib`**: Integrations with external services or core utilities (`gemini.ts`, `supabase.ts`, `utils.ts`).
*   **`src/utils`**: Helper functions for various domains (`api.ts`, `auth.ts`, `dateUtils.ts`, `rewardUtils.ts`).
*   **`server.ts`**: The entry point for the Node.js Express backend.

# Development Guidelines

*   **React Components**: Prefer functional components with hooks.
*   **TypeScript**: Adhere strictly to TypeScript types for better maintainability and error checking.
*   **Styling**: Use Tailwind CSS classes. Apply `clsx` and `tailwind-merge` for conditional or dynamic class composition.
*   **API Interaction**: Use `src/utils/api.ts` for consistent backend communication.
*   **Authentication**: Leverage JWTs and existing `AuthContext` and `src/utils/auth.ts` utilities.
*   **Code Style**: Maintain existing code patterns and best practices, focusing on readability and modularity.
*   **Testing**: When adding new features, consider adding or updating unit/integration tests with `tsx` and E2E tests with Playwright where applicable.

# Project Goal

This application appears to be an educational platform, likely for parents and children, featuring activity management, social stories, quizzes, worksheets, progress tracking, and AI-powered content generation. Focus on secure, user-friendly, and maintainable code.