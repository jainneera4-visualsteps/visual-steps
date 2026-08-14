# Copilot Instructions for `react-example`

This project is a full-stack React application with a Node.js/Express backend, designed as an educational platform for children and parents. It features AI-powered content generation (quizzes, worksheets, social stories), activity management, real-time interactions, and progress tracking.

## Core Technologies:

*   **Frontend**: React 19, React Router DOM, Tailwind CSS (with `@tailwindcss/vite`), Radix UI, Framer Motion, Socket.io-client.
*   **Backend**: Node.js 20 (Express), TypeScript (tsx for dev, esbuild for build), Socket.io, JWT authentication (jsonwebtoken, bcryptjs), Multer for file uploads, Nodemailer for emails, Cookie-parser, CORS.
*   **Database/Auth**: Supabase.
*   **AI Integration**: Google GenAI (`@google/genai`).
*   **Utilities**: clsx, tailwind-merge, uuid, html2canvas, jspdf, canvas-confetti, emoji-picker-react, recharts.

## Project Structure & Key Areas:

*   **`src/`**: Contains all client-side React code and shared utilities.
    *   **`src/components/`**: Reusable UI components (e.g., Button, Card, Input), specific features (AIConciergeChatbox, ChatbotComponent, LayeredCanvasEditor), and UI primitives (`ui/Tooltip`).
    *   **`src/pages/`**: Top-level views for different routes (e.g., Dashboard, ActivityLibrary, KidsDashboard, QuizGenerator, SocialStories, Profile, Auth pages).
    *   **`src/context/`**: React Context API for global state management (AuthContext, WalkthroughContext).
    *   **`src/lib/`**: External service integrations (gemini.ts for AI, supabase.ts for Supabase client).
    *   **`src/constants/`**: Static data and configurations.
    *   **`src/utils/`**: Utility functions for API calls, authentication, date formatting, rewards, etc.
    *   **`src/App.tsx`**: Main application component, typically handling routing.
    *   **`src/main.tsx`**: Entry point for the React application.
*   **`server.ts`**: The Node.js/Express backend server, handling API routes, authentication, and Socket.io connections.
*   **`package.json`**: Defines project dependencies, scripts (dev, build, start, lint), and Node.js version requirement.

## Key Domains:

1.  **Authentication & User Management**: Parents and Kids have distinct roles. Uses JWT, bcryptjs, and Supabase for auth. Protected routes are defined (CommonProtectedRoute, KidProtectedRoute).
2.  **AI-Powered Content Generation**: Integration with Google GenAI for creating quizzes, worksheets, and social stories. (QuizGenerator, WorksheetGenerator, CreateSocialStory, `gemini.ts`, `AIConciergeChatbox`).
3.  **Activity Management**: Creating, assigning, playing, and tracking educational activities and quizzes. (ActivityLibrary, AssignedActivities, PlayQuiz, EditQuiz).
4.  **Social Stories**: A dedicated feature for creating, viewing, and managing personalized social stories, possibly utilizing `LayeredCanvasEditor` and `html2canvas`/`jspdf`.
5.  **Progress Tracking & Reporting**: Generating reports for activities and progress (ProgressReport, SummaryReport).
6.  **Real-time Communication**: Utilizes Socket.io for interactive features or notifications.
7.  **UI/UX**: Leverages Tailwind CSS for styling, Radix UI for accessible components, and Framer Motion for animations.

## Instructions for Copilot:

*   **Context Awareness**: Understand this is a full-stack application. Code suggestions should differentiate between frontend (React, browser-specific APIs) and backend (Node.js, file system, database interactions) logic.
*   **TypeScript First**: Always prioritize strong typing. Use interfaces and types extensively for props, state, API payloads, and function signatures.
*   **Modularity & Reusability**: Encourage breaking down complex features into smaller, reusable components, hooks, and utility functions.
*   **Security**: For backend tasks, prioritize secure coding practices (e.g., input validation, authentication/authorization checks, secure cookie handling, environment variables). For frontend, consider XSS prevention.
*   **Styling**: Use Tailwind CSS classes for styling. When combining classes conditionally, use `clsx` and `tailwind-merge` from `src/lib/utils.ts`.
*   **API Interactions**: Use `src/utils/api.ts` for making HTTP requests to the backend, ensuring proper error handling.
*   **Supabase**: Interact with Supabase using the client initialized in `src/lib/supabase.ts`.
*   **AI Integration**: When working with AI features, ensure prompts are clearly structured and anticipate potential edge cases or error responses from the GenAI API.
*   **Error Handling**: Implement robust error handling on both the client and server sides, providing meaningful feedback to users or logs for debugging.
*   **Performance**: Consider performance implications for large lists, complex animations, or frequent data fetches.
*   **Code Style**: Adhere to existing code style, including formatting, naming conventions, and comment practices.