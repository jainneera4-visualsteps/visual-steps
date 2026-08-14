# Copilot Instructions for `react-example`

This project is a full-stack educational platform for kids and parents, leveraging React for the frontend and Node.js/Express for the backend. It offers interactive learning experiences, games, content generation, and progress tracking.

## Core Technologies:
*   **Frontend:** React 19 (Vite), TypeScript, Tailwind CSS, Radix UI, Framer Motion, Recharts.
*   **Backend:** Node.js (Express), TypeScript, Socket.IO for real-time communication.
*   **Database/Auth/Storage:** Supabase.
*   **Artificial Intelligence:** Google Gemini API integration.
*   **Other:** JWT for authentication, BcryptJS for password hashing, Nodemailer for emails, HTML2Canvas/jsPDF for PDF generation, Multer for file uploads.

## Key Features & Modules:
*   **User Management:** Separate dashboards and protected routes for parents and kids.
*   **Educational Activities & Games:** A variety of interactive games (Memory, Polygons, EvenOdd, Sorting) and an activity library.
*   **Content Generation:** AI-powered Quiz and Worksheet generators, Social Story creation.
*   **AI Concierge:** An AI chatbot for assistance and guidance (`src/components/AIConciergeChatbox.tsx`).
*   **Progress Tracking:** Comprehensive progress and summary reports for activities and quizzes.
*   **Social Stories:** Tools for creating, viewing, and managing social stories (`src/pages/CreateSocialStory.tsx`, `src/components/SocialStoryModal.tsx`).
*   **Authentication:** User signup, login, password reset via Supabase and JWT.
*   **Real-time Interactions:** Socket.IO is used for features that require real-time updates.

## Project Structure & Conventions:
*   **`src/`:** Contains all client-side React code and shared utilities.
    *   **`src/components/`:** Reusable UI components (e.g., `Button`, `Card`) and feature-specific components (e.g., `ChatbotComponent`, `LayeredCanvasEditor`).
    *   **`src/pages/`:** Top-level page components for different routes.
    *   **`src/context/`:** React Context providers for global state management (e.g., `AuthContext`, `WalkthroughContext`).
    *   **`src/lib/`:** Integrations with external services (e.g., `supabase.ts`, `gemini.ts`).
    *   **`src/utils/`:** Helper functions and API clients (e.g., `auth.ts`, `api.ts`).
    *   **`src/constants/`:** Application-wide constants and guide content.
*   **`server.ts`:** Entry point for the Node.js/Express backend.
*   **Styling:** Predominantly uses Tailwind CSS for utility-first styling. Prefer existing Tailwind classes over inline styles or new CSS modules.
*   **TypeScript:** All code is written in TypeScript. Ensure strong typing and interfaces are used appropriately.
*   **Functional Components:** React components are functional, using Hooks for state and lifecycle management.

## Guidelines for Assistance:
*   **Context Awareness:** Understand the distinction between parent and kid user roles and their respective access levels.
*   **Authentication & Authorization:** When dealing with routes or data access, consider the authentication flow (`AuthContext`, `ProtectedRoute`, `KidProtectedRoute`) and Supabase integration.
*   **API Interactions:** Utilize the `src/utils/api.ts` for frontend-to-backend communication and the Express routes defined in `server.ts`.
*   **Supabase:** Many core functionalities (auth, database, storage) rely on Supabase. Be mindful of its API and data structures.
*   **AI Integration:** When implementing or modifying AI features, refer to `src/lib/gemini.ts` and the `AIConciergeChatbox` component.
*   **Component Reusability:** Favor reusing existing components from `src/components/` and `src/components/ui/` where applicable.
*   **Maintain Tailwind CSS:** Ensure any new UI elements or modifications adhere to the existing Tailwind CSS conventions.
*   **Error Handling:** Implement robust error handling for API calls, user inputs, and external service integrations.