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