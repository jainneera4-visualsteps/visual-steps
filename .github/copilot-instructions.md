```markdown
# GitHub Copilot Instructions for Educational Platform

This project is a full-stack educational web application designed for children, featuring interactive activities, games, AI-generated content, and progress tracking.

**Project Goals:**
*   Develop, maintain, and enhance an engaging educational platform for kids.
*   Implement new features, optimize existing ones, and ensure a robust, scalable architecture.

**Key Technologies & Stack:**
*   **Frontend:** React 19, Vite, TypeScript, Tailwind CSS, Radix UI, Framer Motion, React Router DOM, Socket.IO Client.
*   **Backend:** Node.js 20, Express, TypeScript, Socket.IO.
*   **Database/BaaS:** Supabase (PostgreSQL, Authentication, Storage).
*   **AI:** Google Gemini via `@google/genai` for generative features (quizzes, stories) and AI chat (Concierge).
*   **Authentication:** JWT, bcryptjs.
*   **Deployment:** Vercel (likely for frontend) and Node.js server.

**Core Functionalities & Domains:**
*   User Management (Parents & Kids accounts, authentication, profiles).
*   Activity Library, Assignment, and Progress Tracking.
*   Educational Games (Memory, Sorting, Polygons, BrainQuest, EvenOdd, LevelUp).
*   Content Generation: Quizzes, Worksheets, Social Stories (often AI-assisted).
*   Real-time Features: Potentially for collaborative activities or chat (Socket.IO).
*   Reporting: Progress reports, summary reports.
*   AI Concierge/Chatbot for assistance.
*   Creative Tools: Layered Canvas Editor for interactive content.

**Coding Style & Best Practices:**
*   **TypeScript:** Strictly typed code for reliability and maintainability.
*   **React:** Functional components, Hooks, Context API for global state (Auth, Walkthrough).
*   **Tailwind CSS:** Utility-first styling, prefer `tailwind-merge` and `clsx` for dynamic classes.
*   **API Interaction:** Use `src/utils/api.ts` for consistent backend communication.
*   **Supabase:** Leverage `src/lib/supabase.ts` for all Supabase client interactions.
*   **Google Gemini:** Use `src/lib/gemini.ts` for AI model interactions.
*   **Modularity:** Keep components small, focused, and reusable.
*   **File Structure:** Adhere to the existing `src/components`, `src/pages`, `src/context`, `src/lib`, `src/utils`, `src/constants` structure.
*   **Performance:** Optimize for fast loading and smooth user experience, especially on mobile.

**When providing assistance:**
*   **Prioritize Security:** Be mindful of authentication, authorization, and data privacy, especially with user and kid data.
*   **Contextual Understanding:** Understand the user (parent/kid) and the specific educational context of the feature.
*   **AI Integration:** Suggest how to best leverage Gemini for content generation, personalization, or interactive features.
*   **Database Interactions:** Formulate secure and efficient Supabase queries.
*   **UI/UX:** Focus on intuitive user interfaces and engaging experiences for children.
```