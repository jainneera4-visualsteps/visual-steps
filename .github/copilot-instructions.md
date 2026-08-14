# GitHub Copilot Instructions for react-example

This project is a full-stack web application built with a React 19 / TypeScript frontend and a Node.js (Express) backend. It leverages Tailwind CSS for styling and Vite for the frontend build process.

## Core Technologies & Ecosystem:
- **Frontend:** React 19, TypeScript, Vite, React Router DOM v6, Tailwind CSS (v4), Radix UI (Tooltip), Framer Motion, Motion.
- **Backend (`server.ts`):** Node.js 20.x, Express, TypeScript, Socket.io, Multer (file uploads), bcryptjs (password hashing), jsonwebtoken (JWTs), nodemailer (email).
- **Database/Auth:** Supabase (`@supabase/supabase-js`) for backend services.
- **AI Integration:** Google Gemini (`@google/genai`) for generative features, managed via `src/lib/gemini.ts`.
- **Utilities:** `clsx`, `tailwind-merge`, `uuid`, `dotenv`.
- **UI/UX:** `lucide-react` for icons, `recharts` for data visualization, `canvas-confetti`, `emoji-picker-react`, `html2canvas`, `jspdf` for content generation.
- **Real-time:** `socket.io` for bidirectional communication.

## Project Structure & Key Areas:
- **`src/pages/`**: Top-level page components (e.g., `Dashboard`, `ActivityLibrary`, `SocialStories`, `QuizGenerator`, `WorksheetGenerator`).
- **`src/components/`**: Reusable UI components. `src/components/ui/` specifically for Radix-based components.
- **`src/context/`**: React Context providers for global state (e.g., `AuthContext`, `WalkthroughContext`).
- **`src/lib/`**: Core library functions and instances (e.g., `gemini.ts`, `supabase.ts`, `utils.ts`).
- **`src/utils/`**: Helper functions and domain-specific logic (e.g., `api.ts` for API interactions, `auth.ts`, `dateUtils.ts`, `rewardUtils.ts`).
- **`server.ts`**: The main Express backend server, responsible for API routes, authentication, and Socket.io.

## General Guidelines for Copilot:
1.  **TypeScript First:** Always prioritize type safety and explicit typing.
2.  **React Conventions:** Favor functional components with React Hooks.
3.  **Tailwind CSS:** Apply styling using Tailwind CSS classes, utilizing `clsx` and `tailwind-merge` where appropriate.
4.  **Supabase & AI:** Utilize the configured Supabase client (`src/lib/supabase.ts`) and Gemini client (`src/lib/gemini.ts`) for respective operations.
5.  **Authentication:** Adhere to existing patterns for user authentication (`AuthContext`, `jsonwebtoken`, `bcryptjs`) and route protection (`ProtectedRoute` family).
6.  **API Communication:** Use the `src/utils/api.ts` helpers for consistent communication with the `server.ts` backend.
7.  **Modularity:** Keep components and utility functions focused on a single responsibility.
8.  **Error Handling:** Implement comprehensive error handling on both the client and server sides.
9.  **Code Style:** Match the existing code style, favoring readability and maintainability.
10. **Security:** Be mindful of security implications for all changes, especially when dealing with user data, authentication, and API endpoints.