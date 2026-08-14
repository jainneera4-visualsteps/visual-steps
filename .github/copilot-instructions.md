This is a full-stack TypeScript project featuring a React 19 frontend with Vite and Tailwind CSS, and an Express.js backend running on Node.js 20.x.

**Project Overview:**
The application is an educational platform, likely for children, offering a variety of interactive features:
*   **Interactive Games:** A suite of educational games like Even/Odd, Memory, Polygon Hunt, Sorting, Level Up, and BrainQuest.
*   **AI-Powered Content:** Integrates Google Generative AI (`@google/genai`) for creating quizzes, worksheets, and social stories, as well as an `AIConciergeChatbox`.
*   **User Management:** Features parent/kid dashboards, profile management, and protected routes for different user types.
*   **Social Stories:** Tools for creating and viewing personalized social stories (`LayeredCanvasEditor`, `SocialStoryModal`).
*   **Progress Tracking:** Reports on user/kid progress (`ProgressReport`, `SummaryReport`).
*   **Real-time Features:** Utilizes Socket.IO for potential real-time interactions or notifications.
*   **Authentication & Database:** Leverages Supabase for authentication and database operations, alongside JWT and bcryptjs for secure user handling.

**Key Technologies & Patterns:**
*   **Frontend:** React 19, TypeScript, Vite, Tailwind CSS (with `@tailwindcss/vite`), Radix UI (`@radix-ui/react-tooltip`), Framer Motion.
*   **Backend:** Express.js, TypeScript, Node.js, `tsx` for development, `esbuild` for production build. Handles API routes, authentication (`jsonwebtoken`, `bcryptjs`), file uploads (`multer`), and email (`nodemailer`).
*   **State Management:** Primarily React Context (`AuthContext`, `WalkthroughContext`) and local component state.
*   **Styling:** Utility-first with Tailwind CSS. Adhere to existing component styling patterns.
*   **API Interactions:** Use `src/utils/api.ts` for backend communication and `src/lib/supabase.ts` for Supabase client interactions.
*   **AI Integration:** Interact with Google Generative AI via `src/lib/gemini.ts` for AI-powered features.
*   **File Structure:** Components in `src/components/`, pages in `src/pages/`, utilities in `src/utils/` and `src/lib/`.

**Instructions for Copilot:**
*   **Context is key:** Understand the educational/kids' platform context when generating code.
*   **Full-stack awareness:** Recognize tasks may span frontend (React, styling, API calls) and backend (Express routes, database interactions, AI calls).
*   **Adhere to patterns:** Generate code consistent with existing React components, Tailwind CSS classes, Express API structures, and TypeScript types.
*   **Prioritize Security:** Be mindful of authentication, authorization, and data validation, especially for Supabase and Express routes.
*   **Performance:** Suggest efficient solutions for data fetching, rendering, and real-time updates.
*   **AI Integration:** When working with AI features, consider best practices for prompt engineering and error handling with `@google/genai`.
*   **Testing:** Suggest relevant unit or integration tests where appropriate, aligned with TypeScript best practices.