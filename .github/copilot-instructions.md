
This is a fullstack TypeScript React application for an educational platform, primarily targeting children.

**Key Technologies:**
*   **Frontend:** React 19, Vite, Tailwind CSS (with Radix UI, Framer Motion, Lucide icons).
*   **Backend:** Node.js (v20+), Express.js (API), `tsx` for development.
*   **Database/Auth:** Supabase.
*   **AI:** Google Gemini (`@google/genai`) for features like AI Concierge and content generation.
*   **Real-time:** Socket.io (client & server).
*   **State/Routing:** React Context API, React Router DOM v6+.
*   **Tools:** TypeScript, esbuild, `clsx`, `tailwind-merge`.

**Core Functionality:**
*   **Educational Games:** A variety of interactive games (Memory, Sorting, Even/Odd, Polygons, BrainQuest, LevelUp).
*   **Content Generation:** AI-powered Quiz and Worksheet Generators.
*   **Social Stories:** Creation, viewing, and management of social stories.
*   **AI Concierge:** An AI chatbot providing guidance and assistance.
*   **Activity Management:** Assigning and tracking activities for children.
*   **User Management:** Separate dashboards for parents/guardians and kids, authentication (JWT, bcrypt).
*   **Reporting:** Progress and summary reports.
*   **Utilities:** PDF generation (`jspdf`, `html2canvas`), emoji picker, confetti animations.

**File Structure Overview:**
*   `src/components`: Reusable UI components and specific feature components (e.g., `AIConciergeChatbox`, `LayeredCanvasEditor`).
*   `src/pages`: Application views, often corresponding to routes.
*   `src/context`: Global state management (Auth, Walkthrough).
*   `src/lib`: Integrations (Supabase, Gemini) and general utilities.
*   `src/utils`: API calls, auth helpers, date utilities, reward logic.
*   `src/constants`: Static configuration and guide content.

**When providing assistance:**
*   Prioritize TypeScript-first solutions.
*   Adhere to Tailwind CSS and Radix UI conventions for styling and accessibility.
*   Consider both client-side (React) and server-side (Express, Supabase) implications for fullstack tasks.
*   Leverage Supabase for data operations and authentication where applicable.
*   Suggest AI integration (Gemini) for features involving content generation or intelligent responses.
*   Be aware of `AuthContext` for user roles and authentication state, and `WalkthroughContext` for guided tours.

```markdown
This is a full-stack educational platform built with React (V19) and TypeScript for the frontend, and an Express.js server (also TypeScript) for the backend. It uses Supabase for database operations and Google GenAI for AI-powered features.

**Key Technologies:**
*   **Frontend:** React (V19), TypeScript, Vite, Tailwind CSS (v4), Radix UI, Framer Motion, React Router DOM, Recharts, Socket.io-client.
*   **Backend:** Express.js, TypeScript, `tsx` (dev), `esbuild` (build), Supabase, Google GenAI, bcryptjs, jsonwebtoken, multer, nodemailer, cookie-parser, socket.io.
*   **Database:** Supabase.
*   **AI:** Google GenAI for content generation (quizzes, worksheets) and an AI concierge.
*   **Styling:** Tailwind CSS with utility-first classes, clsx, tailwind-merge.
*   **Other:** HTML2Canvas, JSPDF, Canvas Confetti, Lucide React icons.

**Project Structure & Architecture:**
*   **`src/`**: Contains the main React application.
    *   **`src/components/`**: Reusable UI components (e.g., `Button`, `Card`, `Input`, `Tooltip`). Includes specialized components like `AIConciergeChatbox`, `ChatbotComponent`, `LayeredCanvasEditor`, and modals.
    *   **`src/pages/`**: Top-level views/routes (e.g., `Dashboard`, `ActivityLibrary`, `QuizGenerator`, `SocialStories`, various games).
    *   **`src/context/`**: React Context providers for global state management (e.g., `AuthContext`, `WalkthroughContext`).
    *   **`src/lib/`**: External service integrations and library configurations (`gemini.ts`, `supabase.ts`, `utils.ts`).
    *   **`src/utils/`**: Utility functions (`api.ts`, `auth.ts`, `dateUtils.ts`, `rewardUtils.ts`).
    *   **`src/constants/`**: Application-wide constants.
    *   **`src/App.tsx`**: Main application component, handles routing.
    *   **`src/main.tsx`**: Entry point for the React application.
*   **`server.ts`**: Express.js backend server, handling API routes, authentication, file uploads, and Socket.io connections.
*   **`package.json`**: Defines dependencies and scripts (`dev`, `build`, `start`, `lint`).
*   **`tsconfig.json`**: TypeScript configuration.

**Core Functionality:**
*   **User Management:** Authentication (signup, login, password reset), user roles (parent/teacher, kid), protected routes.
*   **AI-Powered Learning:** AI Concierge, Quiz Generator, Worksheet Generator using Google GenAI.
*   **Interactive Activities & Games:** A variety of educational games (`MemoryGame`, `PolygonHunt`, `EvenOddGame`, `SortingGame`), quizzes, and an activity library.
*   **Social Stories:** Creation, viewing, and management of social stories.
*   **Progress Tracking:** Dashboards, progress reports, and summary reports.
*   **Real-time Features:** Socket.io for potential real-time interactions (e.g., chat, game updates).
*   **Canvas Editor:** For creating or modifying visual content.

**Coding Style and Conventions:**
*   **TypeScript:** Strict typing for robust code.
*   **Functional Components:** Use React hooks for state and lifecycle management.
*   **Tailwind CSS:** Apply utility classes for styling. Prefer composition over direct inline styles.
*   **Context API:** Use for application-wide state.
*   **Supabase:** Interact with Supabase services (Auth, Database, Storage) via the provided client.
*   **Express:** Build RESTful APIs and handle server-side logic in `server.ts`.
*   **Modularity:** Keep components, pages, and utilities focused on single responsibilities.

**When writing code, Copilot should:**
*   Prioritize TypeScript type safety and adherence to existing interfaces.
*   Generate functional React components with hooks.
*   Use Tailwind CSS classes for styling, respecting existing patterns (e.g., `cn` utility from `lib/utils.ts` for conditional classes).
*   Suggest robust error handling for both frontend and backend.
*   Adhere to existing architectural patterns (e.g., use `AuthContext` for authentication checks, `supabase.ts` for database interactions).
*   Consider performance and security, especially for backend code.
*   Focus on creating an intuitive and responsive user experience for the frontend.
```

