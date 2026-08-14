# GitHub Copilot Instructions

This is a full-stack web application built with React 19, TypeScript, and Tailwind CSS for the frontend, and Node.js with Express for the backend. It's an educational platform, likely focused on children, featuring AI-generated content, real-time communication, and user authentication.

## Project Overview

*   **Frontend**: React 19, Vite, TypeScript, Tailwind CSS, Radix UI, Framer Motion, React Router DOM, Socket.io Client.
*   **Backend**: Node.js, Express, TypeScript, Socket.io, JWT for authentication, bcrypt for password hashing, Multer for file uploads, Nodemailer for emails, Google Gemini for AI content generation, and Supabase for database interactions.
*   **Purpose**: Provides features like user dashboards (parents/kids), activity libraries, social story creation/viewing, quiz/worksheet generation, progress reports, and authentication.

## Architecture

*   **Client-Side (`src/`)**: React components, pages, contexts, and utility functions.
*   **Server-Side (`server.ts`)**: Express server handling API routes, authentication, real-time communication via Socket.io, and integrations with AI and database services. `tsx` is used for development, `esbuild` for production build.

## Key Directories and Files

*   **`src/App.tsx`**: Main application component, sets up routing.
*   **`src/main.tsx`**: Entry point for the React application.
*   **`src/components/`**: Reusable UI components (e.g., `Button`, `Card`, `Input`, `Select`, `Textarea`).
    *   **`src/components/ui/`**: Radix UI components (e.g., `Tooltip`).
    *   **`src/components/*ProtectedRoute.tsx`**: Manages access control based on user roles.
*   **`src/pages/`**: Route-specific components and views.
*   **`src/context/`**: React Context providers for global state management.
    *   **`AuthContext.tsx`**: Handles user authentication state.
    *   **`WalkthroughContext.tsx`**: Manages application walkthroughs/guides.
*   **`src/lib/`**: External service integrations and core utilities.
    *   **`gemini.ts`**: Integration with Google Gemini for AI capabilities (e.g., social story/quiz generation).
    *   **`supabase.ts`**: Supabase client setup.
    *   **`utils.ts`**: General utility functions (e.g., `clsx`, `tailwind-merge`).
*   **`src/utils/`**: Application-specific helper functions.
    *   **`api.ts`**: Centralized API call logic.
    *   **`auth.ts`**: Authentication-related helpers.
    *   **`dateUtils.ts`**: Date formatting and manipulation.
    *   **`rewardUtils.ts`**: Logic for managing rewards.
*   **`server.ts`**: Backend server entry point.

## Coding Guidelines

*   **Language**: TypeScript is strictly used for type safety across the entire codebase.
*   **Frontend Framework**: React 19, functional components with hooks.
*   **Styling**: Tailwind CSS for utility-first styling. Prefer existing Tailwind classes.
*   **UI Components**: Prioritize using existing components from `src/components/` and `src/components/ui/`.
*   **Authentication**: Leverage `jsonwebtoken` and `bcryptjs` on the backend, and `AuthContext` on the frontend.
*   **API Calls**: Use `src/utils/api.ts` for all backend interactions.
*   **State Management**: Favor React Context (e.g., `AuthContext`, `WalkthroughContext`) for global state, and `useState`/`useReducer` for local component state.
*   **Real-time**: Use `socket.io` for real-time features.

## Copilot Instructions

*   **Prioritize TypeScript**: Always generate code with explicit types. Infer types where obvious, but prefer clarity.
*   **Tailwind CSS**: When generating JSX, use Tailwind CSS utility classes for styling. Do not use inline styles or external CSS files unless explicitly requested.
*   **Component Reusability**: Suggest using or creating new components in `src/components/` for reusable UI patterns.
*   **API Integration**: When working on frontend features that require data, assume interaction with the backend via `src/utils/api.ts`.
*   **Authentication/Authorization**: Be mindful of authentication contexts (`AuthContext`) and protected routes (`*ProtectedRoute.tsx`) when generating logic for user access.
*   **AI Integration**: When dealing with content generation (e.g., social stories, quizzes, worksheets), consider the context of the `src/lib/gemini.ts` integration.
*   **Full-stack Awareness**: Recognize the interplay between frontend and backend. For example, if a new frontend feature requires a backend endpoint, suggest adding it to `server.ts`.
*   **Security**: Be cautious and suggest secure practices when dealing with authentication, user data, and file uploads.