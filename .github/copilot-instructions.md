```markdown
This is a full-stack TypeScript project.

**Frontend:**
*   **Framework:** React 19 with Vite.
*   **Styling:** Tailwind CSS (utility-first, `clsx`, `tailwind-merge`), Radix UI (accessible components), Lucide React (icons).
*   **Animation:** Framer Motion.
*   **Routing:** React Router DOM v7 (components in `src/pages`, `src/components/ProtectedRoute.tsx`).
*   **State Management:** React Context API (e.g., `src/context/AuthContext.tsx`).
*   **Features:** Dashboards (parent/kid), social stories, quizzes, activities, progress reports, rewards.
*   **UI Components:** Custom components in `src/components/` and Radix UI in `src/components/ui/`.

**Backend:**
*   **Platform:** Node.js 20.x with Express.
*   **Language:** TypeScript (server runs with `tsx`, built with `esbuild`).
*   **Realtime:** Socket.io for bidirectional communication.
*   **Authentication:** JWT, `bcryptjs` for password hashing, `cookie-parser`.
*   **Database:** Supabase (client setup in `src/lib/supabase.ts`).
*   **API:** Defined in `src/utils/api.ts` and handled by the Express server.
*   **File Uploads:** Multer.
*   **Email:** Nodemailer.

**Key Integrations & Utilities:**
*   **AI:** Google Gemini API via `@google/genai` (`src/lib/gemini.ts`).
*   **PDF/Image Generation:** `html2canvas`, `jspdf`.
*   **Confetti:** `canvas-confetti`.
*   **Charts:** Recharts.
*   **Markdown Rendering:** `react-markdown`.
*   **Unique IDs:** `uuid`.

**General Guidelines:**
*   **Type Safety:** Prioritize strong TypeScript types and interfaces.
*   **Structure:** Adhere to the existing `src/pages` and `src/components` organization.
*   **Code Style:** Maintain consistency with existing React functional components, hooks, and Tailwind CSS practices.
*   **Domain:** Understand the project's context as an educational platform for children, focusing on parental controls, content generation, and progress tracking.
```