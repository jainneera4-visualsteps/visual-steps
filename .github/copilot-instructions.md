```markdown
# Copilot Instructions for react-example

This is a full-stack educational platform designed for children and parents, built with React 19, Vite 6, TypeScript, Node.js 24, and Express.js.

## Key Technologies & Libraries:

*   **Frontend**: React 19, Vite 6, TypeScript, React Router DOM v7, Tailwind CSS 4, Framer Motion, Radix UI (Tooltip), Lucide React, Recharts.
*   **Backend**: Node.js 24, Express.js, TypeScript, Supabase client (`@supabase/supabase-js`), Google Generative AI client (`@google/genai`), Socket.io, Multer (file uploads), bcryptjs (password hashing), jsonwebtoken (JWT auth), cookie-parser, nodemailer (email).
*   **Database**: Supabase (PostgreSQL).
*   **Authentication**: JWT-based, bcryptjs for password hashing, protected routes.
*   **AI Integration**: Utilizes Google Generative AI (Gemini) for content generation (quizzes, social stories).
*   **Real-time Features**: Socket.io for interactive elements.
*   **Styling**: Tailwind CSS 4, PostCSS, clsx, tailwind-merge.
*   **Testing**: Playwright for end-to-end browser tests, `tsx --test` for unit/integration tests.

## Project Structure & Conventions:

*   **`src/pages`**: Top-level views and application routes.
*   **`src/components`**: Reusable UI components. `src/components/ui` for specific UI library integrations.
*   **`src/context`**: React Context API for global state management (Auth, Walkthrough).
*   **`src/lib`**: Integrations with external services (Gemini, Supabase) and core utility functions.
*   **`src/utils`**: Application-specific utilities (API calls, authentication helpers, date formatting, rewards).
*   **`src/constants`**: Application-wide constants.
*   **Backend (server.ts)**: Handles API endpoints, authentication, database interactions, AI requests, and real-time communication.

## Development Guidelines:

*   **TypeScript**: Prioritize type safety throughout the codebase.
*   **Component-based**: Follow React's component-based architecture for UI.
*   **Styling**: Use Tailwind CSS for all styling, leveraging utility classes.
*   **API Interactions**: Centralize API calls via `src/utils/api.ts`.
*   **Security**: Be mindful of security best practices, especially around authentication, input validation, and data handling.
*   **Code Quality**: Write clean, readable, and maintainable code with appropriate comments where necessary.
*   **Testing**: When adding new features, consider adding relevant unit/integration tests (`tsx --test`) or end-to-end tests (`playwright test`).

## Focus Areas for Assistance:

*   **Full-stack development**: Both React frontend and Express backend.
*   **AI integration**: Working with the Google Generative AI API for content generation.
*   **Supabase interactions**: Data storage, retrieval, and real-time subscriptions.
*   **Authentication & Authorization**: Implementing and managing user sessions and access controls.
*   **Real-time features**: Enhancing or debugging Socket.io implementations.
*   **UI/UX**: Creating interactive and responsive user interfaces using React, Tailwind CSS, and Framer Motion.
*   **Performance**: Optimizing both client-side and server-side performance.
*   **Testing**: Assisting with writing or debugging Playwright or `tsx` tests.
```