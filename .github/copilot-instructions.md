This is a full-stack educational application built with React (v19) and an Express.js backend, primarily in TypeScript. It provides tools for parents and kids, focusing on AI-powered content generation (quizzes, worksheets, social stories) using Google Gemini, activity management, progress tracking, and real-time features. Supabase serves as the backend-as-a-service.

## Core Technologies:

*   **Frontend**: React 19, Vite, TypeScript, React Router DOM v7, Tailwind CSS (v4), Radix UI (Tooltip), Framer Motion, Recharts, `socket.io-client`.
*   **Backend**: Node.js 24.x, Express.js, TypeScript (via `tsx` for dev), Socket.io, bcryptjs, jsonwebtoken, cookie-parser, multer, nodemailer.
*   **Database/Auth**: Supabase (`@supabase/supabase-js`).
*   **AI**: Google Gemini API (`@google/genai`).
*   **Build Tools**: Vite (client), esbuild (server).
*   **Testing**: `tsx --test`.

## Architecture & Features:

1.  **Monorepo-like Structure**: A single `src/` directory houses both client-side React components and server-side logic (though `server.ts` is separate from `src`). `server.ts` is the entry point for the Express backend.
2.  **Client-Side (`src/`)**:
    *   **React Application**: Handles UI, routing, state management (AuthContext, WalkthroughContext), and interaction with the backend API.
    *   **Authentication**: User login/signup, protected routes (`ProtectedRoute`, `KidProtectedRoute`, `CommonProtectedRoute`).
    *   **AI-Powered Content**: UI for generating quizzes, worksheets, and social stories.
    *   **Activity Management**: Assigning, managing, and tracking educational activities.
    *   **Reporting**: Displays progress and summary reports.
    *   **Real-time Interaction**: Uses `socket.io-client` for real-time features.
    *   **UI/UX**: Utilizes Tailwind CSS for styling, Radix UI components, Framer Motion for animations, and Lucide React for icons.
3.  **Server-Side (`server.ts`)**:
    *   **Express API**: Provides RESTful endpoints for the frontend.
    *   **Authentication**: JWT-based authentication with `bcryptjs` for password hashing and `jsonwebtoken` for token management. `cookie-parser` handles session cookies.
    *   **Database Interaction**: Interfaces with Supabase for data persistence.
    *   **AI Integration**: Calls Google Gemini API (`src/lib/gemini.ts`) for content generation.
    *   **Real-time Communication**: `socket.io` for bi-directional event-based communication.
    *   **File Uploads**: `multer` for handling multipart/form-data.
    *   **Email Services**: `nodemailer` for sending emails (e.g., password resets).

## Key Directories & Files:

*   `src/pages`: Top-level components for application routes (e.g., Dashboard, QuizGenerator, SocialStories).
*   `src/components`: Reusable UI components (e.g., Button, Card, Input, Modals). `src/components/ui` for Radix-based components.
*   `src/context`: React Context providers for global state (AuthContext, WalkthroughContext).
*   `src/lib`: Core utilities and client instances (Gemini API, Supabase client, general helpers).
*   `src/utils`: Application-specific utility functions (API calls, auth logic, date handling, rewards).
*   `server.ts`: The Express.js backend entry point.

## Development Environment:

*   `npm run dev`: Starts the backend server with `tsx` and the Vite client development server concurrently.
*   `npm run build`: Compiles the client (Vite) and the server (esbuild) for production.
*   `npm start`: Runs the built production server.
*   `npm test`: Executes all tests using `tsx`. Specific test suites are available (`test:integration`, `test:api`).
*   `npm run lint`: Performs TypeScript type checking.