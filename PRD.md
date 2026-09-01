# Product Requirements Document: Visual Steps

**Status:** Active product, reflecting the current repository

**Last updated:** August 20, 2026

## 1. Product summary

Visual Steps is a web platform for parents and caregivers supporting an autistic child / adult. It combines visual schedules, personalized learning content, progress tracking, family communication, and positive reinforcement in one environment.

Parents and caregivers use a management dashboard to plan activities and tailor the experience to each child / adult. The child / adult uses a simplified dashboard that emphasizes predictability, clear instructions, immediate feedback, and earned rewards.

The product is a support and educational tool. It does not diagnose conditions, provide clinical treatment, or replace advice from qualified healthcare or education professionals.

## 2. Problem

Families often need several disconnected tools to manage routines, break tasks into visual steps, create differentiated learning resources, track progress, and motivate positive behavior. Generic task managers can be too complex for a child / adult-facing experience, while educational products may not reflect the person’s schedule, interests, sensory needs, or family reward system.

Visual Steps provides a shared system in which a parent or caregiver can prepare and supervise the plan while the child / adult receives only the information and choices relevant to the current task.

## 3. Users

### Primary users

- **Parents and caregivers:** Create profiles, plan routines, generate content, communicate with the child / adult, and monitor progress.
- **Child / adult:** Complete visual activities and quizzes, view messages and stories, and redeem earned rewards.

### Potential future users

- Therapists, educators, and other trusted collaborators with explicitly granted, role-limited access.

## 4. Product principles

- **Clarity:** Present tasks in small, concrete, visual steps.
- **Predictability:** Make schedules, rules, completion state, and rewards easy to understand.
- **Personalization:** Adapt content to the child / adult’s age, learning level, interests, strengths, and support needs.
- **Positive reinforcement:** Reward effort and completion without using punitive mechanics.
- **Parent control:** Keep assignment, configuration, purchasing, and sensitive information under caregiver supervision.
- **Accessibility:** Use readable, responsive interfaces and avoid unnecessary cognitive load.
- **Privacy:** Treat child / adult profiles, behavioral context, messages, and learning data as sensitive information.

## 5. Implemented scope

### 5.1 Accounts and access

- Public, temporary guest demonstration with realistic in-memory parent and child views. Demo changes never call application APIs or Supabase and reset on browser reload.
- Parent signup, login, logout, profile management, and password recovery through Supabase Auth.
- Parent-protected application routes.
- Child access using a parent email and child-specific access code.
- JWT-based child sessions with child-protected routes.
- Ownership and role validation on protected API operations.

### 5.2 Child profiles

- Create, edit, view, and delete multiple child profiles.
- Store profile details including date of birth, grade, interests, hobbies, strengths, challenges, sensory or behavioral context, therapies, schedule boundaries, rules, avatar, theme, printing permission, time zone, and reward configuration.

### 5.3 Visual activities and scheduling

- Create activities with a type, category, description, image, link, due date, time of day, and recurrence settings.
- Break activities into ordered text-and-image steps.
- Create reusable activity templates and assign them to children.
- Automatically introduce new parents to the core workflow and let every parent replay onboarding from the dashboard.
- Provide a parent-only AI assistant for app guidance, owned-child progress summaries, and contextual activity suggestions while refusing unrelated requests. Maintain a verified catalog for every registered route, show parents the covered areas, and collect missing-information reports for deliberate review rather than unsafe automatic self-training.
- Show and enforce a database-backed allowance of 30 parent-assistant questions per UTC day to make AI spending predictable.
- Display pending and completed work in the child dashboard.
- Let parents optionally require verification for an individual activity.
- Display submitted activities in parent and child waiting-for-verification queues.
- Let parents type a specific observed positive behavior—with optional suggestions—and grant 1–10 bonus rewards. Show a configurable 1–10 recent bonuses as compact reason-and-amount entries on the child dashboard; children cannot request them.
- Grant completion credit and rewards only after final completion; allow a parent to reassign an unverified submission without granting rewards.
- Preserve completion history and use time-zone-aware dates.
- Support offline awareness and cached dashboard data for graceful degradation.

### 5.4 Learning materials

- Provide fixed, curated sample quiz, worksheet, and social story previews to guests and authenticated parents without invoking AI or storing sample data.
- Generate, save, edit, assign, play, and delete quizzes.
- Limit a child to one submitted quiz attempt per assigned activity occurrence; parent reassignment permits one new attempt while preserving prior results.
- Record quiz results and include them in child reporting.
- Celebrate correct answers and meaningful completions with accessible animations that respect reduced-motion preferences.
- Generate, save, edit, print, and delete worksheets.
- Generate, edit, assign, view, and delete personalized social stories.
- Allow parents to review and modify AI-generated material before use.

### 5.5 Progress and reporting

- Show activity history and learning results for an individual child.
- Provide detailed progress and summary-report views.
- Visualize relevant results with charts and printable/exportable output where supported.

### 5.6 Rewards and motivation

- Configure a reward type, quantity, and balance per child.
- Award rewards for completed work.
- Create reward-shop items with cost, image, location, and active state.
- Let children request or buy rewards and let parents confirm pending rewards.
- Keep a purchase history.

### 5.7 Communication and assistance

- Send, list, select, and delete parent messages shown on a child's dashboard.
- Synchronize relevant changes through child-specific Socket.IO rooms on persistent Node deployments.

## 6. Core user journeys

### Parent onboarding

1. A parent creates an account and profile.
2. The parent adds a child and records relevant preferences and support context.
3. The parent configures the child's schedule, theme, access code, and reward system.
4. The parent creates or assigns the first visual activity.

### Daily activity completion

1. A child signs in with the parent email and child code.
2. The child sees the activities relevant to the current day and time.
3. The child opens an activity and follows its ordered visual steps.
4. An activity without verification completes immediately. An activity requiring verification moves to a waiting queue.
5. The parent verifies and completes it, or reassigns it to pending for another attempt.
6. Completion totals and rewards update only when the activity reaches the completed state.

### Personalized content creation

1. A parent selects a child and content type.
2. The parent supplies a subject, topic, scenario, or other generation options.
3. Gemini generates a draft quiz, worksheet, social story, or guidance response.
4. The parent reviews, edits, saves, prints, or assigns the result.

### Reward redemption

1. A parent creates reward items and assigns token costs.
2. The child earns tokens through supported completions.
3. The child chooses an affordable reward.
4. The purchase is recorded and, where configured, awaits parent confirmation.

## 7. Functional requirements

- A parent must only access and modify children and resources they own.
- A child session must only access resources allowed for that child.
- Activity ordering, recurrence, due dates, and completion history must remain consistent across parent and child views.
- Date-sensitive behavior must use the child's configured time zone when available.
- Reward balances must not become inconsistent during completion or purchase operations.
- A child submission awaiting verification must not grant rewards or increase completion totals.
- AI output must be treated as an editable draft and stored only after the relevant user action.
- Protected API requests must carry a valid parent or child token.
- The application must give understandable feedback for authentication, API, and AI-generation failures.
- Printable content must respect the child's printing setting where enforced by the experience.

## 8. Non-functional requirements

### Privacy and security

- Use Supabase Auth for parent identity and strong, deployment-specific secrets for child JWTs.
- Recover parent passwords through single-use Supabase email links; do not use knowledge-based security questions.
- Keep service-role, Gemini, JWT, and SMTP credentials on the server.
- Enforce ownership in the API and row-level security in Supabase.
- Avoid placing sensitive child information in logs, generated public URLs, or browser-exposed environment variables.
- Provide a defined retention and deletion policy before broader production use.

### Accessibility and usability

- Support keyboard navigation, visible focus states, sufficient contrast, and descriptive labels.
- Preserve valid Contact-page requests in a protected administrator Support Inbox before attempting notification email delivery. Administrators must be able to distinguish unread, open, and resolved conversations, reply to the sender, and reopen a conversation without accessing family-profile content.
- Keep child-facing controls large, consistent, and understandable.
- Ensure layouts work on mobile, tablet, and desktop screens.
- Respect reduced-motion preferences for nonessential animation.

### Reliability and performance

- Provide clear loading, empty, offline, and error states.
- Retry only transient API failures and avoid duplicate mutations.
- Preserve data integrity when a real-time connection is unavailable.
- Use persistent object storage rather than a server-local upload directory in production/serverless environments.

### Maintainability

- Keep shared API, authentication, time-zone, and reward rules centralized.
- Validate TypeScript with `npm run lint` and produce a production bundle with `npm run build`.
- Apply database changes through reviewed, non-destructive migrations.

## 9. Technical architecture

| Layer | Current implementation |
| --- | --- |
| Web client | React 19, TypeScript, React Router, Vite |
| Styling and UI | Tailwind CSS, Lucide, Radix Tooltip, Framer Motion |
| API server | Express in `server.ts` |
| Authentication | Supabase Auth for parents; JWT child sessions |
| Database | Supabase PostgreSQL with row-level security |
| AI | Google Gemini via `@google/genai` |
| Real-time updates | Socket.IO on persistent Node deployments |
| Reporting/export | Recharts, jsPDF, html2canvas |
| Uploads | Multer and local filesystem in the current implementation |
| Deployment | Bundled Node server and Vercel configuration |

The current `setup_database.sql` is a clean-install schema that drops and recreates tables. It must not be used as an incremental production migration.

## 10. Success measures

Product analytics are not yet defined in the repository. Initial measures should include:

- Percentage of new parents who create a child and assign an activity.
- Weekly active parent-child pairs.
- Assigned activities completed on the intended day.
- Quiz and worksheet generation-to-assignment rate.
- Child return rate and activity completion streaks.
- Reward redemption rate without balance or approval errors.
- Parent-reported ease of planning and child-reported clarity.
- API, AI-generation, and authentication error rates.

Metrics should be privacy-conscious, aggregated where possible, and avoid unnecessary collection of sensitive child data.

## 11. Known constraints and documentation gaps

- Durable uploads require object storage; the current local upload directory is unsuitable for many serverless deployments.
- Socket.IO is disabled through a mock fallback on Vercel, limiting real-time behavior there.
- The database folder contains a clean-install script and several targeted utility scripts, but no unified, versioned migration history.
- Automated unit, integration, accessibility, and end-to-end test suites are not currently exposed through package scripts.
- Some behavioral-data migration utilities exist, but behavior tracking is not represented as a complete first-class route in the current application UI.
- Clinical, privacy, accessibility, and child-safety review should occur before positioning the product for regulated or professional care settings.

## 12. Roadmap

### Near term

1. Establish versioned, non-destructive database migrations and document production upgrades.
2. Add automated tests for authentication, ownership, activity completion, recurrence, rewards, and quiz scoring.
3. Move uploaded assets to durable Supabase Storage or equivalent object storage.
4. Audit child and parent flows for WCAG accessibility and reduced-motion support.
5. Add privacy documentation, data export/deletion flows, retention rules, and clear AI disclosures.

### Medium term

1. Add privacy-conscious product analytics and operational monitoring.
2. Improve longitudinal reports and meaningful trend explanations.
3. Make offline behavior explicit, reliable, and conflict-safe.
4. Expand visual activity and learning-content templates.
5. Harden AI generation with structured validation, age-appropriate safeguards, and parent review gates.

### Longer term

1. Add role-based collaboration for caregivers, educators, and therapists with parent consent.
2. Support shared plans and controlled professional observations.
3. Evaluate native notifications and calendar integrations.
4. Validate product outcomes through user research with autistic people, families, educators, and clinicians.

## 13. Out of scope without further validation

- Medical diagnosis, crisis support, or treatment recommendations.
- Claims that the application improves clinical outcomes.
- Autonomous AI assignment of content or behavioral decisions without parent review.
- Unrestricted third-party access to child profiles or progress data.

<!-- FEATURE_REGISTRY:START -->
## Synchronized feature registry

This section is generated from `feature-registry.json`. Update the registry when a feature is added, changed, or removed; normal lint, test, development, and build commands refresh this table.

| Feature | Plan | Introduced | Latest update | Current description |
| --- | --- | --- | --- | --- |
| Clear visual activities | starter | 2026-03-01 | 2026-08-31 | Parents can mark a normal activity as optional so it becomes a choice after today’s assigned activities are finished. |
| Parent activity verification | starter | 2026-08-20 | — | Choose which activities require parent approval before rewards are earned. |
| Positive behavior bonuses | starter | 2026-08-20 | — | Parents can recognize a specific calm, focused, helpful, or persistent behavior. |
| Personalized, fair quizzes | starter | 2026-08-20 | 2026-08-24 | Quiz creation now connects every quiz to a measurable learning objective, lets parents privately try it as the learner, controls illustration use, and turns completed answers into practical planning guidance. |
| Curated learning samples | starter | 2026-08-21 | 2026-09-02 | Parents can see one shared daily allowance for AI-created quizzes, worksheets, and social stories, with the exact local time when creation becomes available again. |
| Replayable parent tour | starter | 2026-08-20 | 2026-08-27 | Parent and guest tours now include current feature guidance from the shared Visual Steps catalog. |
| Visual Steps Parent Assistant | family | 2026-08-20 | 2026-09-01 | The assistant keeps the current day’s conversation until 7:00 AM, offers Copy and Listen controls, and can search current venue information when a parent plans an outing for their child or adult learner. |
| Controlled social-story sharing | family | 2026-08-19 | — | Share one social story using a private link that can expire or be revoked. |
| Parent stories and community publishing | starter | 2026-08-25 | — | Write, preview, and submit family experiences or practical ideas through a reviewed community publishing process. |
| Narrated tour and temporary Guest Login | starter | 2026-08-21 | 2026-08-27 | Visitors can now watch a friendly, chapter-based Visual Steps presentation directly on the Home page before entering Guest Login. |
| Learning, progress, and meaningful rewards | starter | 2026-03-15 | — | Create personalized resources, understand progress, and connect earned rewards to meaningful goals. |
| Parent-controlled data management | starter | 2026-08-24 | — | Review saved family records, set a reminder period, and selectively remove history that is no longer useful. |

### Feature update history

| Updated | Feature | Improvement | Family-facing summary |
| --- | --- | --- | --- |
| 2026-09-02 | Curated learning samples | Predictable allowance for AI learning materials | Parents can see one shared daily allowance for AI-created quizzes, worksheets, and social stories, with the exact local time when creation becomes available again. |
| 2026-09-01 | Visual Steps Parent Assistant | Daily Parent Assistant history and outing planning | The assistant keeps the current day’s conversation until 7:00 AM, offers Copy and Listen controls, and can search current venue information when a parent plans an outing for their child or adult learner. |
| 2026-08-31 | Clear visual activities | Learner-chosen additional activities | Parents can mark a normal activity as optional so it becomes a choice after today’s assigned activities are finished. |
| 2026-08-27 | Replayable parent tour | Guidance that stays current across the app | Parent and guest tours now include current feature guidance from the shared Visual Steps catalog. |
| 2026-08-27 | Narrated tour and temporary Guest Login | A narrated Visual Steps tour using real app screens | Visitors can now watch a friendly, chapter-based Visual Steps presentation directly on the Home page before entering Guest Login. |
| 2026-08-27 | Curated learning samples | Current samples in the familiar learner layout | The sample quiz, worksheet, and social story now mirror the current family-created viewing experience while keeping the same dependable example content. |
| 2026-08-24 | Personalized, fair quizzes | Clearer quiz goals, learner preview, learning insights, and thoughtful illustrations | Quiz creation now connects every quiz to a measurable learning objective, lets parents privately try it as the learner, controls illustration use, and turns completed answers into practical planning guidance. |
<!-- FEATURE_REGISTRY:END -->
