import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('newsletter administration uses a server-side allow-list with RLS', async () => {
  const migration = await read('database_updates/2026-08-21_weekly_newsletters.sql');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.app_admins/);
  assert.match(migration, /ALTER TABLE public\.app_admins ENABLE ROW LEVEL SECURITY/);
  assert.doesNotMatch(migration, /CREATE POLICY[^;]+ON public\.app_admins/is);
});

test('every newsletter administration API is authenticated and administrator checked', async () => {
  const server = await read('server.ts');
  for (const route of ['status', 'submissions', 'subscribers', 'preview']) {
    assert.match(server, new RegExp(`/api/newsletter/admin/${route}[^\\n]*authenticateToken, requireNewsletterAdmin`));
  }
  assert.match(server, /app\.post\('\/api\/newsletter\/admin\/send-now', authenticateToken, requireNewsletterAdmin/);
  assert.match(server, /app\.post\('\/api\/newsletter\/admin\/publish-now', authenticateToken, requireNewsletterAdmin/);
  assert.match(server, /websitePublished: true, emailDelivered: true/);
  assert.match(server, /issue is live on the website; email delivery will retry later today/);
  assert.match(server, /Cache-Control', 'no-store, max-age=0/);
  assert.match(server, /app_admins'\)\.select\('user_id'\)/);
});

test('newsletter administrator page is nested under the parent protected route', async () => {
  const [app, page] = await Promise.all([read('src/App.tsx'), read('src/pages/NewsletterAdmin.tsx')]);
  const protectedBlock = app.slice(app.indexOf('<Route element={<ProtectedRoute />}'), app.indexOf('<Route path="social-stories/view/'));
  assert.match(protectedBlock, /newsletter-admin/);
  assert.match(page, /\/api\/newsletter\/admin\/submissions/);
  assert.match(page, /\/api\/newsletter\/admin\/preview/);
  assert.doesNotMatch(page, /Permanently delete/);
  assert.match(page, /Administrators can approve or reject a submission, but cannot delete it/);
  assert.match(page, /Save newsletter template/);
  assert.match(page, /Email delivery preview/);
  assert.match(page, /Weekly delivery day/);
  assert.match(page, /Delivery time/);
  assert.match(page, /resolvedOptions\(\)\.timeZone/);
  assert.match(page, /Publish upcoming issue/);
  assert.match(page, /Send published issue/);
  assert.match(page, /Subscriber delivery status/);
  assert.match(page, /last_sent_issue_date/);
  assert.match(page, /CommunityRichTextEditor/);
  assert.match(page, /same formatting is preserved/);
  assert.match(page, /FormattedNewsletterContent content=\{item\.content\}/);
});

test('delivery weekday, local hour and timezone are database-backed and editable only by an administrator', async () => {
  const [server, migration, vercel] = await Promise.all([read('server.ts'), read('database_updates/2026-08-21_weekly_newsletters.sql'), read('vercel.json')]);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.newsletter_settings/);
  assert.match(migration, /delivery_hour INTEGER NOT NULL DEFAULT 0/);
  assert.match(migration, /delivery_timezone TEXT NOT NULL DEFAULT 'America\/New_York'/);
  assert.match(server, /app\.put\('\/api\/newsletter\/admin\/settings', authenticateToken, requireNewsletterAdmin/);
  const crons = JSON.parse(vercel).crons;
  assert.equal(crons.length, 24);
  crons.forEach((cron: { path: string; schedule: string }, hour: number) => assert.deepEqual(cron, { path: `/api/cron/weekly-newsletter/${hour}`, schedule: `0 ${hour} * * *` }));
  assert.match(server, /local\.weekday !== settings\.deliveryWeekday \|\| local\.hour < settings\.deliveryHour/);
  assert.match(server, /publishedIssue \|\| await createWeeklyNewsletter\(now\)/);
  assert.match(server, /recoveryRun: local\.hour > settings\.deliveryHour/);
});

test('administrators can approve or reject but cannot delete parent submissions', async () => {
  const [server, page] = await Promise.all([read('server.ts'), read('src/pages/NewsletterAdmin.tsx')]);
  assert.doesNotMatch(server, /app\.delete\('\/api\/newsletter\/admin\/submissions\/:id'/);
  assert.match(page, /review\('approved'\)/);
  assert.match(page, /review\('rejected'\)/);
  assert.doesNotMatch(page, /deleteSubmission/);
});

test('parents can save drafts and delete only their own draft or rejected submissions', async () => {
  const [server, page, migration] = await Promise.all([read('server.ts'), read('src/pages/Newsletter.tsx'), read('database_updates/2026-08-21_weekly_newsletters.sql')]);
  assert.match(server, /app\.put\('\/api\/newsletter\/community-submissions\/draft', authenticateToken/);
  assert.match(server, /app\.delete\('\/api\/newsletter\/community-submissions\/:id', authenticateToken/);
  assert.match(server, /\.delete\(\)\.eq\('id', submissionId\)\.eq\('user_id', req\.user\.id\)\.in\('status', \['draft', 'rejected'\]\)/);
  assert.match(server, /Only drafts and rejected submissions can be deleted/);
  assert.match(migration, /status IN \('draft', 'pending', 'approved', 'rejected'\)/);
  assert.match(page, /Save draft/);
  assert.match(page, /onDelete=\{deleteMySubmission\}/);
  assert.match(page, /item\.status==='draft'\|\|item\.status==='rejected'/);
});

test('saved newsletter drafts are protected and used by scheduled publication', async () => {
  const server = await read('server.ts');
  assert.match(server, /app\.put\('\/api\/newsletter\/admin\/draft', authenticateToken, requireNewsletterAdmin/);
  assert.match(server, /savedDraft && !savedDraft\.published_at/);
  assert.match(server, /section_visibility/);
});

test('publication and delivery are separate administrator actions without duplicate delivery', async () => {
  const server = await read('server.ts');
  assert.match(server, /app\.post\('\/api\/newsletter\/admin\/publish-now', authenticateToken, requireNewsletterAdmin/);
  assert.match(server, /app\.post\('\/api\/newsletter\/admin\/send-now', authenticateToken, requireNewsletterAdmin/);
  assert.match(server, /const issue = await createWeeklyNewsletter\(\);/);
  assert.match(server, /There is no published newsletter to send/);
  assert.match(server, /const delivery = await sendNewsletterIssue\(issue, getPublicAppOrigin\(req\)\)/);
  assert.match(server, /last_sent_issue_date\.lt\.\$\{issue\.issue_date\}/);
});

test('newsletter email starts with a linked image of the current issue first two pages', async () => {
  const server = await read('server.ts');
  assert.match(server, /createNewsletterEmailPreview/);
  assert.match(server, /newsletter\/issues\/\$\{encodeURIComponent\(issue\.issue_date\)\}/);
  assert.match(server, /<a href="\$\{escapeEmailHtml\(issueUrl\)\}"[^>]*><img src="cid:visual-steps-newsletter-preview"/);
  assert.match(server, /attachments: \[\{ filename: `visual-steps-weekly-\$\{issue\.issue_date\}\.png`/);
});

test('newsletter combines feature guidance, hides empty sections, and explains popularity without public counts', async () => {
  const [server, page, adminPage, styles, membershipPlans, migration, envExample] = await Promise.all([read('server.ts'), read('src/pages/Newsletter.tsx'), read('src/pages/NewsletterAdmin.tsx'), read('src/index.css'), read('src/content/membershipPlans.ts'), read('database_updates/2026-08-21_weekly_newsletters.sql'), read('.env.example')]);
  assert.match(membershipPlans, /import type \{ FeaturePlan \}/);
  assert.doesNotMatch(server, /from '\.\/src\/content\/membershipPlans'/);
  assert.match(server, /const featureChanges = \[/);
  assert.match(server, /changeType: 'new'/);
  assert.match(server, /changeType: 'updated'/);
  assert.match(server, /update\.updatedOn >= period\.periodStart && update\.updatedOn <= period\.periodEnd/);
  assert.match(server, /new_features: featureChanges\.map/);
  assert.match(server, /baseNewsletterSectionHtml = \(title: string, items: string\[\], columns = 1, bulleted = false, numbered = false\) => items\.length \?/);
  assert.doesNotMatch(page, /uses recorded/);
  assert.match(server, /feature_details: 'Practical Ways to Use Visual Steps'/);
  assert.match(server, /recommended_resources: 'Suggested Activities, Games, Puzzles and Other Ideas'/);
  assert.match(server, /suggested_books_resources: 'Suggested Books, Places and Resources'/);
  assert.match(page, /if\(!items\.length\)return null/);
  assert.match(page, /What's New in Visual Steps/);
  assert.match(page, /Feature update/);
  assert.match(styles, /\.newsletter-page/);
  assert.match(styles, /break-after: page/);
  assert.doesNotMatch(page, /mt-6 grid gap-5 lg:grid-cols-2/);
  assert.match(adminPage, /item\.changeType === 'updated' \? 'Feature update' : 'New feature'/);
  assert.match(page, /featureIdFor/);
  assert.match(page, /to=\{`\/features\/\$\{featureId\}`\}/);
  assert.match(server, /\/features\/\$\{encodeURIComponent\(item\.id\)\}/);
  assert.match(page, /visible\('feature_previews'\).*fullWidth/);
  assert.match(server, /feature_previews: \[\]/);
  assert.match(server, /feature_previews: false/);
  assert.match(server, /concise_editorial: true/);
  assert.match(page, /newFeaturesSection=visible\('new_features'\)\?<Section fullWidth itemColumns=\{conciseEditorial\?1:2\} numbered=\{conciseEditorial\}/);
  assert.match(page, /!conciseEditorial&&newFeaturesSection/);
  assert.ok(page.indexOf('{testimonialsSection}') < page.indexOf("conciseEditorial&&visible('feature_details')"));
  assert.ok(adminPage.indexOf("'parent_testimonials'") < adminPage.indexOf("'feature_details'"));
  assert.match(server, /return `\$\{rendered\}\$\{meaningfulUse\}`/);
  assert.ok(page.indexOf("visible('parent_tips')") < page.lastIndexOf('conciseEditorial&&newFeaturesSection'));
  assert.ok(page.lastIndexOf('conciseEditorial&&newFeaturesSection') < page.indexOf("visible('membership_details')"));
  assert.match(server, /new_features: "What's New in Visual Steps"/);
  assert.match(server, /Choose one everyday routine to practice together this week\.[^']+a teenager’s school preparation, or an adult’s household and community goals\./);
  assert.match(page, /visible\('parent_tips'\)[\s\S]*?<Section bulleted/);
  assert.ok(page.indexOf("visible('parent_tips')") < page.indexOf("visible('membership_details')"));
  assert.match(server, /parent_tips[^\n]+tipItems, 1, true[^\n]+concise_editorial[^\n]+featureItems, 2[^\n]+membership_details/);
  assert.match(server, /suggested_books_resources: unusedBooks/);
  assert.match(server, /previouslyUsedTips/);
  assert.match(server, /previouslyUsedActivities/);
  assert.match(server, /previouslyUsedBooks/);
  assert.match(server, /previouslyUsedPopularFeatures/);
  assert.match(server, /previouslyUsedVisualStepsSuggestions/);
  assert.match(server, /\[0, 1, 2, 3, 4\]\.map/);
  assert.match(server, /unusedActivities[^\n]+slice\(0, 5\)/);
  assert.match(server, /unusedBooks[^\n]+slice\(0, 5\)/);
  assert.match(server, /visualStepsSuggestions[^\n]+slice\(0, 5\)/);
  assert.match(server, /const addVisualStepsUtility/);
  assert.match(server, /add the routine or support as a short Visual Steps activity/);
  assert.match(server, /place the idea in Visual Steps with a clear time, picture/);
  assert.match(server, /resource inspires one relevant next step/);
  assert.match(server, /index === 0 \|\| index === 3/);
  assert.match(server, /feature_details: visualStepsSuggestions/);
  assert.match(server, /membership_details: currentMembershipDetails/);
  assert.match(server, /compact: true,[\s\S]*description: `\$\{conciseNewsletterText\(change\.summary, 1\)\} \$\{conciseNewsletterText\(change\.familyImpact, 1\)\}`/);
  assert.match(page, /numbered\?'ol':'ul'/);
  assert.match(page, /list-decimal/);
  assert.match(page, /newsletter-numbered-features/);
  assert.match(styles, /\.newsletter-flow-content \.newsletter-numbered-features > li > b:first-child \{[\s\S]*break-after: avoid-column/);
  assert.match(styles, /\.newsletter-flow-content ol\.grid \{[\s\S]*display: block/);
  assert.match(styles, /-webkit-column-break-after: avoid/);
  assert.match(page, />Read more<\/Link>/);
  assert.match(server, /title === newsletterSectionTitles\.new_features/);
  assert.match(server, /meaningful engagement and healthy physical, emotional, social, practical, and intellectual growth for autistic people of all ages/);
  assert.match(server, /autistic people of all ages—from younger children through teenagers and adults/);
  assert.match(server, /age, communication style, autonomy, abilities, interests and support needs/);
  assert.match(server, /Adaptable movement circuit/);
  assert.match(server, /Plan, create, and share/);
  assert.match(server, /Notice-and-share outing/);
  assert.match(server, /Complete a meaningful real-life task together/);
  assert.match(server, /Harvard Center on the Developing Child/);
  assert.match(server, /American Academy of Pediatrics/);
  assert.match(server, /Special Olympics/);
  assert.match(server, /Autistic Self Advocacy Network/);
  assert.match(server, /getNewsletterFeatureImpact/);
  assert.match(server, /familyImpact: getNewsletterFeatureImpact\(feature\)/);
  assert.match(server, /How this supports growth:/);
  assert.match(server, /newsletterCommunityContext/);
  assert.match(server, /newsletterTestimonialContext/);
  assert.match(page, /How this supports growth:/);
  assert.match(page, /newsletter-copy newsletter-book/);
  assert.match(styles, /\.newsletter-copy p,[\s\S]*\.newsletter-copy li[\s\S]*text-align: justify/);
  assert.match(server, /text-align:justify;text-justify:inter-word/);
  assert.match(server, /display:grid;grid-template-columns:1fr;gap:14px/);
  assert.doesNotMatch(server, /grid-template-columns:\$\{columns === 2/);
  assert.match(page, /suggested_books_resources'\).*fullWidth itemColumns=\{2\}/);
  assert.match(server, /Everyday sequence puzzle/);
  assert.match(server, /Shared jigsaw and conversation break/);
  assert.match(server, /Your local public library/);
  assert.match(server, /An accessible park or recreation center/);
  assert.match(migration, /suggested_books_resources JSONB NOT NULL DEFAULT '\[\]'::jsonb/);
  assert.match(server, /formatNewsletterDate/);
  assert.match(server, /normalizeNewsletterDateText/);
  assert.match(server, /title: normalizeNewsletterDateText\(savedDraft\.title\)/);
  assert.match(server, /introduction: normalizeNewsletterDateText\(savedDraft\.introduction\)/);
  assert.match(server, /day: '2-digit', month: 'short', year: 'numeric'/);
  assert.match(page, /day:'2-digit',month:'short',year:'numeric'/);
  assert.match(adminPage, /formatNewsletterDate\(item\.submitted_at\)/);
  assert.match(migration, /advertisements JSONB NOT NULL DEFAULT '\[\]'::jsonb/);
  assert.match(migration, /footer_links JSONB NOT NULL DEFAULT '\{\}'::jsonb/);
  assert.match(migration, /'advertisement'/);
  assert.match(server, /allowedTypes = new Set\(\['story', 'news', 'information', 'tip', 'testimonial', 'advertisement'\]\)/);
  assert.match(server, /Advertisements require a destination link/);
  assert.match(server, /Mission-Aligned Advertisements/);
  assert.match(server, /newsletterSectionTitles\.advertisements, advertisementItems, 2/);
  assert.match(page, /visible\('advertisements'\)/);
  assert.match(page, /rel="sponsored noreferrer"/);
  assert.match(adminPage, /'advertisements'/);
  assert.match(server, /Communication support/);
  assert.match(server, /Occupational support/);
  assert.match(server, /Positive behavior support/);
  assert.match(server, /FACEBOOK_URL/);
  assert.match(server, /INSTAGRAM_URL/);
  assert.match(page, /NewsletterLinks/);
  assert.match(page, /isSubscribePage/);
  assert.match(page, /\['Visual Steps Home',links\?\.mainPage\|\|'\/'\]/);
  assert.match(page, /\['Pricing',links\?\.pricing\|\|'\/pricing'\]/);
  assert.match(page, /\['Subscribe Newsletter','\/newsletter\/subscribe'\]/);
  assert.match(envExample, /FACEBOOK_URL=/);
  assert.match(envExample, /INSTAGRAM_URL=/);
});
