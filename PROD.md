# Visual Steps production guide

## Synchronized product information

Production-facing feature information is generated from `feature-registry.json`. Add or update a registry entry whenever an approved application workflow changes. Running the normal development, lint, test, or build command refreshes the generated feature blocks used by project documentation and server-side communication surfaces.

<!-- FEATURE_REGISTRY:START -->
## Synchronized feature registry

This section is generated from `feature-registry.json`. Update the registry when a feature is added, changed, or removed; normal lint, test, development, and build commands refresh this table.

| Feature | Plan | Introduced | Latest update | Current description |
| --- | --- | --- | --- | --- |
| Clear visual activities | starter | 2026-03-01 | 2026-09-12 | Stable parent navigation groups related tools without turning every new feature into another top-level menu. |
| Parent activity verification | starter | 2026-08-20 | — | Choose which activities require parent approval before rewards are earned. |
| Positive behavior bonuses | starter | 2026-08-20 | — | Parents can recognize a specific calm, focused, helpful, or persistent behavior. |
| Personalized, fair quizzes | starter | 2026-08-20 | 2026-08-24 | Quiz creation now connects every quiz to a measurable learning objective, lets parents privately try it as the learner, controls illustration use, and turns completed answers into practical planning guidance. |
| Curated learning samples | starter | 2026-08-21 | 2026-09-02 | Parents can see one shared daily allowance for AI-created quizzes, worksheets, and social stories, with the exact local time when creation becomes available again. |
| Parent Quick Start and replayable tour | starter | 2026-08-20 | 2026-09-16 | A focused three-step Quick Start guides parents through one real profile, activity, and learner preview without introducing a separate setup interface. |
| Visual Steps Parent Assistant | family | 2026-08-20 | 2026-09-01 | The assistant keeps the current day’s conversation until 7:00 AM, offers Copy and Listen controls, and can search current venue information when a parent plans an outing for their child or adult learner. |
| Controlled social-story sharing | family | 2026-08-19 | — | Share one social story using a private link that can expire or be revoked. |
| Parent stories and community publishing | starter | 2026-08-25 | 2026-09-15 | Connect now keeps parent messages, community contributions, newsletter subscriptions, and a clearer weekly archive together. |
| Narrated tour and temporary Guest Login | starter | 2026-08-21 | 2026-09-16 | Guest Login now guides visitors through one suggested activity instead of a long sequence of screen callouts. |
| Adaptive place-value learning games | starter | 2026-09-03 | — | Practice place value through four focused games with five levels, automatic progression, optional assignment, personalized companions, and parent-visible scores. |
| Learning, progress, and meaningful rewards | starter | 2026-03-15 | — | Create personalized resources, understand progress, and connect earned rewards to meaningful goals. |
| Parent-controlled activity and rewards history | starter | 2026-08-24 | — | Review a learner’s recent activity and reward history, open grouped details, and selectively remove history that is no longer useful. |

### Feature update history

| Updated | Feature | Improvement | Family-facing summary |
| --- | --- | --- | --- |
| 2026-09-16 | Parent Quick Start and replayable tour | A simpler first experience for parents | A focused three-step Quick Start guides parents through one real profile, activity, and learner preview without introducing a separate setup interface. |
| 2026-09-16 | Narrated tour and temporary Guest Login | A focused guest activity trial without signup | Guest Login now guides visitors through one suggested activity instead of a long sequence of screen callouts. |
| 2026-09-15 | Parent stories and community publishing | One Connect area for contact, community, and newsletters | Connect now keeps parent messages, community contributions, newsletter subscriptions, and a clearer weekly archive together. |
| 2026-09-12 | Clear visual activities | A clearer parent workspace as Visual Steps grows | Stable parent navigation groups related tools without turning every new feature into another top-level menu. |
| 2026-09-12 | Clear visual activities | A calm way to ask for help | Learners see a familiar picture-led prompt for asking a nearby parent or caregiver for help. |
| 2026-09-11 | Clear visual activities | Rewards matched to each activity | Parents choose a reward amount for each activity according to the learner’s effort and challenge. |
| 2026-09-11 | Clear visual activities | Readable themed activity worlds | Learner themes now add calm color, companions, decorations, activity accents, and celebrations without placing text over photographs. |
| 2026-09-11 | Clear visual activities | Flexible activity meanings and learner choice | Parents use Learner Can Choose or Do Today, while learners choose from one clear activity view. |
| 2026-09-11 | Clear visual activities | Calm time guidance without a rigid schedule | Parents can add suggested periods or exact times, while learners see what is relevant now without facing one long schedule. |
| 2026-09-11 | Clear visual activities | A compact activity form that keeps the essentials in view | Activity meaning, rewards, verification, timing, and repetition remain visible in compact rows without large settings panels. |
| 2026-09-02 | Curated learning samples | Predictable allowance for AI learning materials | Parents can see one shared daily allowance for AI-created quizzes, worksheets, and social stories, with the exact local time when creation becomes available again. |
| 2026-09-01 | Visual Steps Parent Assistant | Daily Parent Assistant history and outing planning | The assistant keeps the current day’s conversation until 7:00 AM, offers Copy and Listen controls, and can search current venue information when a parent plans an outing for their child or adult learner. |
| 2026-08-27 | Parent Quick Start and replayable tour | Guidance that stays current across the app | Parent and guest tours now include current feature guidance from the shared Visual Steps catalog. |
| 2026-08-27 | Narrated tour and temporary Guest Login | A narrated Visual Steps tour using real app screens | Visitors can now watch a friendly, chapter-based Visual Steps presentation directly on the Home page before entering Guest Login. |
| 2026-08-27 | Curated learning samples | Current samples in the familiar learner layout | The sample quiz, worksheet, and social story now mirror the current family-created viewing experience while keeping the same dependable example content. |
| 2026-08-24 | Personalized, fair quizzes | Clearer quiz goals, learner preview, learning insights, and thoughtful illustrations | Quiz creation now connects every quiz to a measurable learning objective, lets parents privately try it as the learner, controls illustration use, and turns completed answers into practical planning guidance. |
<!-- FEATURE_REGISTRY:END -->

## Release check

Before deployment, run `npm run lint`, `npm test`, and `npm run build`. Apply any new file in `database_updates` to the intended Supabase project before deploying code that depends on it. Verify environment variables in the deployment environment without committing secret values to the repository.

### Retired schema decisions

Consultations are permanently retired and are not planned to return. Apply `database_updates/2026-09-17_remove_consultations.sql` only after deploying code that no longer references consultation routes or tables.

The release audit on 18 Sep 2026 verified production read-only and confirmed that `public.kids.pending_reward` does not exist (`PostgreSQL 42703`). Do not add a drop migration for that column. Reward balances and pending purchases must continue to use the current reward tables and APIs.

### Support Inbox deployment

Apply `database_updates/2026-09-02_support_inbox.sql` and `database_updates/2026-09-02_support_inbox_outbound.sql` before deploying the Support Inbox routes. Confirm that `SUPABASE_SERVICE_ROLE_KEY` is configured for server-side message storage and administrator access, and that SMTP plus `CONTACT_TO_EMAIL` are configured for Contact notifications, in-app replies, and administrator-composed parent messages. After deployment, submit one Contact-page message, verify it appears under **Admin → Support Inbox**, send a test reply, and confirm the conversation becomes resolved. Then use **Compose message** with one selected test parent, confirm the recipient cannot see other addresses, and verify the sent-delivery summary.

For a signed-in parent, open **Support → Messages** and verify the grid contains only messages sent from that parent's account. Select **Send Message**, confirm the focused form matches the Add/Edit Activity interaction, send a message, and verify it appears at the top of the grid. Open its View action and confirm the complete message, current status, and any administrator reply are shown.

### Learning games deployment

Apply `database_updates/2026-09-02_game_companions.sql`, `database_updates/2026-09-03_game_results.sql`, and `database_updates/2026-09-15_game_session_insights.sql`. From **Games**, save a different companion for a test learner, reload, and confirm the selection persists. Assign each game once through **Activities Setup → Add Activity → Pre-defined Activity Type → Games** and confirm the assigned link opens in the child session. Answer one question correctly and one incorrectly, leave before completing every level, then open **Progress → Game Scores**. Confirm the partial session appears and View shows its attempts, score, accuracy, duration, strengths, mistakes, and suggested next support.

### Progress history deployment

Apply `database_updates/2026-09-15_activity_action_history.sql` and `database_updates/2026-09-15_unlimited_behavior_bonus.sql`. `database_updates/2026-09-15_rewards_history.sql` removes the obsolete copied rewards-history table because Rewards History reads purchases and positive recognition directly from their source tables. Verify **Progress → Activity History** shows one row per learner, category, and activity name; View must show every action in chronological order with date and time. A parent verification must appear once as **Verified & Completed**, while a direct completion appears as **Completed**. Deleting a summary must remove only matching `activity_action_history` rows and must not remove the live activity. Verify **Rewards History** supports rolling periods or custom dates, search, heading-based sorting, page-only Select all, purchase locations, and `System` for positive recognition.
