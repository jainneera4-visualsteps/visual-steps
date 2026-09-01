# Visual Steps production guide

## Synchronized product information

Production-facing feature information is generated from `feature-registry.json`. Add or update a registry entry whenever an approved application workflow changes. Running the normal development, lint, test, or build command refreshes the generated feature blocks used by project documentation and server-side communication surfaces.

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

## Release check

Before deployment, run `npm run lint`, `npm test`, and `npm run build`. Apply any new file in `database_updates` to the intended Supabase project before deploying code that depends on it. Verify environment variables in the deployment environment without committing secret values to the repository.

### Support Inbox deployment

Apply `database_updates/2026-09-02_support_inbox.sql` and `database_updates/2026-09-02_support_inbox_outbound.sql` before deploying the Support Inbox routes. Confirm that `SUPABASE_SERVICE_ROLE_KEY` is configured for server-side message storage and administrator access, and that SMTP plus `CONTACT_TO_EMAIL` are configured for Contact notifications, in-app replies, and administrator-composed parent messages. After deployment, submit one Contact-page message, verify it appears under **Admin → Support Inbox**, send a test reply, and confirm the conversation becomes resolved. Then use **Compose message** with one selected test parent, confirm the recipient cannot see other addresses, and verify the sent-delivery summary.
