This is a full-stack React (v19) and Node.js (Express) application for educational tools, primarily aimed at kids and educators/parents.

**Core Technologies:**
*   **Frontend**: React (v19), TypeScript, Vite, Tailwind CSS (v4), Radix UI, Framer Motion, React Router DOM (v7), Recharts, Socket.io Client.
*   **Backend**: Node.js (v20), Express, TypeScript, Socket.io, Multer, Nodemailer, Bcryptjs, JWT, Cookie-parser.
*   **Database/Auth**: Supabase.
*   **AI**: Google Generative AI (`@google/genai`) for content generation (quizzes, social stories, worksheets).
*   **Utilities**: `clsx`, `tailwind-merge`, `uuid`, `html2canvas`, `jspdf`, `canvas-confetti`.

**Architecture:**
The project uses a client-server architecture. The frontend (`src/`) handles user interface and interactions, communicating with an Express backend (`server.ts`, `src/utils/api.ts`) for data and logic. Supabase serves as the primary database and authentication provider. AI features are integrated via `@google/genai` using `src/lib/gemini.ts`.

**Key Features & Domains:**
*   **User Management**: Authentication (signup, login, password reset), role-based access (Kid, Parent/Educator) using `AuthContext` and `ProtectedRoute` variants.
*   **Content Generation**: AI-powered creation of Quizzes, Social Stories, and Worksheets.
*   **Content Editor**: `LayeredCanvasEditor` for visual content manipulation (e.g., social stories, worksheets) with `html2canvas` and `jspdf` for export.
*   **Activity Management**: Assigning and tracking activities, activity libraries.
*   **Progress Tracking**: Dashboards, Progress Reports, Summary Reports.
*   **Real-time Features**: `socket.io` for potential real-time interactions or notifications.
*   **UI/UX**: Responsive design with Tailwind CSS, animations with Framer Motion, interactive components with Radix UI.

**Coding Conventions & Patterns:**
*   **TypeScript**: Strict TypeScript usage across the codebase.
*   **React**: Functional components, hooks, and contexts (`AuthContext`, `WalkthroughContext`).
*   **Styling**: Tailwind CSS for all styling, using `clsx` and `tailwind-merge` for conditional classes.
*   **API Interaction**: Centralized API calls via `src/utils/api.ts`.
*   **Supabase**: All Supabase interactions handled via the client in `src/lib/supabase.ts`.
*   **AI Integration**: Utilize functions in `src/lib/gemini.ts` for AI-related tasks.
*   **Utils**: Leverage `src/lib/utils.ts` and `src/utils/*.ts` for common helpers (e.g., date formatting, rewards).

**Copilot Focus Areas:**
*   **Frontend Components**: Generate React components (e.g., modals, forms, UI elements) following existing `src/components` and `src/components/ui` patterns, using TypeScript, Tailwind CSS, and hooks.
*   **Pages**: Create new pages (`src/pages`) that integrate with `AuthContext` and `api.ts`.
*   **Backend Endpoints**: Develop new Express routes and middleware in `server.ts` or related files.
*   **Data Models/Interfaces**: Assist in defining TypeScript interfaces for data structures (e.g., Supabase records, API request/response types).
*   **Supabase Interactions**: Generate code for CRUD operations using the Supabase client.
*   **AI Prompts/Logic**: Aid in crafting effective prompts and integrating with `gemini.ts` for AI-driven features.
*   **Refactoring**: Suggest improvements to existing code for performance, readability, and adherence to patterns.
*   **Tests**: Generate unit or integration tests for new features.