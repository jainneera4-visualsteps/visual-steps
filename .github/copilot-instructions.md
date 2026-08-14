This is a full-stack educational web application built with React (Vite, TypeScript, TailwindCSS, Framer Motion, Radix UI) for the frontend and Express.js (TypeScript, Node.js 20) for the backend.

**Key Technologies & Features:**
*   **Frontend:** React 19, Vite, TypeScript, TailwindCSS, Radix UI, Framer Motion, React Router DOM, Recharts, Canvas Confetti, Emoji Picker, html2canvas, jsPDF, React Markdown.
*   **Backend:** Express.js, TypeScript, Node.js 20, Socket.io (real-time communication), JSON Web Tokens (JWT) for authentication, bcryptjs for password hashing, Multer for file uploads, Nodemailer for emails, CORS, Cookie Parser.
*   **Integrations:**
    *   **Database/Auth:** Supabase for backend services (DB, Auth).
    *   **AI:** Google Gemini API (`@google/genai`) for AI-powered features (e.g., `AIConciergeChatbox`, quiz/worksheet generation, social stories).
*   **Architecture:**
    *   **Client-Side Rendering (CSR):** React application built with Vite.
    *   **API Server:** Express.js server (`server.ts`) handling API requests, authentication, and Socket.io connections.
    *   **Context API:** Used for global state management (e.g., `AuthContext`, `WalkthroughContext`).
    *   **Protected Routes:** Implemented for different user roles (e.g., `ProtectedRoute`, `KidProtectedRoute`).

**Project Structure Highlights:**
*   `src/components/`: Reusable UI components, specialized features like `AIConciergeChatbox`, `ChatbotComponent`, `LayeredCanvasEditor`, `SocialStoryModal`.
*   `src/pages/`: Contains all application views, covering various educational games, activity libraries, content generators (quizzes, worksheets, social stories), dashboards, and user profiles.
*   `src/context/`: Manages global state for authentication and guided walkthroughs.
*   `src/lib/`: Houses third-party service integrations (Supabase, Gemini API) and general utilities.
*   `src/utils/`: Contains utility functions for API calls, authentication, date formatting, and rewards.
*   `server.ts`: The main Express.js backend server entry point.

**Copilot Focus:**
*   **Full-stack context:** Understand interactions between React frontend and Express/Supabase/Gemini backend.
*   **Component-based development:** Leverage existing components and create new ones following established patterns.
*   **TypeScript:** Adhere to strict TypeScript types.
*   **TailwindCSS:** Utilize for styling, prefer utility classes.
*   **Authentication & Authorization:** Understand JWT, protected routes, and user roles.
*   **AI Integration:** Be aware of how `gemini.ts` is used to generate content and assist users.
*   **Data Flow:** Recognize how data flows between components, contexts, and API calls.
*   **Educational Domain:** Understand the context of children's learning, games, and educational tools.