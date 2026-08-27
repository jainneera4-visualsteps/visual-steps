import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('public information pages are routed and discoverable', async () => {
  const [app, layout] = await Promise.all([
    readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/Layout.tsx', import.meta.url), 'utf8'),
  ]);
  for (const route of ['testimonials', 'contact', 'newsletter']) {
    assert.match(app, new RegExp(`path="${route}"`));
    assert.match(layout, new RegExp(`/${route}`));
  }
});

test('testimonials are public only after consent and administrator approval', async () => {
  const [page, newsletter, server] = await Promise.all([
    readFile(new URL('../src/pages/Testimonials.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/Newsletter.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../server.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(page, /fetch\('\/api\/testimonials'\)/);
  assert.match(page, /Previous family story/);
  assert.match(page, /Next family story/);
  assert.match(page, /h-\[36rem\]/);
  assert.ok(page.indexOf('By {testimonials[visibleStory].displayName}') < page.indexOf('FormattedNewsletterContent content={testimonials[visibleStory].quote}'));
  assert.match(page, /newsletter\/community\?type=testimonial/);
  assert.doesNotMatch(page, /<form/);
  assert.match(newsletter, /consentToPublish/);
  assert.match(newsletter, /CommunityRichTextEditor/);
  assert.doesNotMatch(newsletter, /html\.push\('<p><br><\/p>'\)/);
  assert.match(newsletter, /nestedBlocks\.map\(renderBlock\)/);
  assert.match(newsletter, /Preview submission/);
  assert.match(server, /app\.get\('\/api\/testimonials'/);
  assert.match(server, /eq\('contribution_type', 'testimonial'\)/);
  assert.match(server, /eq\('status', 'approved'\)/);
  assert.match(server, /eq\('consent_to_publish', true\)/);
  assert.doesNotMatch(page, /child records.*\.map/i);
});

test('public contact and newsletter pages keep SMTP secrets on the server', async () => {
  const [contact, newsletter] = await Promise.all([
    readFile(new URL('../src/pages/Contact.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/Newsletter.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(contact, /mailto:/);
  assert.match(newsletter, /\/api\/newsletter\/subscribe/);
  assert.match(newsletter, /\/api\/newsletters/);
  assert.doesNotMatch(newsletter, /mailto:/);
  assert.doesNotMatch(`${contact}\n${newsletter}`, /SMTP_PASS|SMTP_USER|service_role/);
});

test('community stories do not require a source link', async () => {
  const [newsletter, server] = await Promise.all([
    readFile(new URL('../src/pages/Newsletter.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../server.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(newsletter, /post\.contributionType === 'news' \|\| post\.contributionType === 'advertisement'/);
  assert.match(newsletter, /\{linkRequired && <Input/);
  assert.match(newsletter, /No website link is needed for this type of submission/);
  assert.match(newsletter, /Your contribution \(20–\{maxLength\.toLocaleString\(\)\} characters\)/);
  assert.match(newsletter, /By \{post\.displayName\}/);
  assert.match(newsletter, /FormattedNewsletterContent content=\{post\.content\}/);
  assert.match(newsletter, /communitySectionTypes/);
  assert.match(newsletter, /Submission preview/);
  assert.match(newsletter, /Preview submission/);
  assert.match(newsletter, /Edit submission/);
  assert.match(newsletter, /My submissions/);
  assert.match(newsletter, /Edit and resubmit/);
  assert.match(newsletter, /Resubmit for review/);
  assert.match(newsletter, /newsletter-book/);
  assert.match(newsletter, /newsletter-page/);
  assert.match(newsletter, /NewsletterFlipBook/);
  assert.match(newsletter, /NewsletterContentsPage/);
  assert.match(newsletter, />Contents</);
  assert.match(newsletter, /data-newsletter-section-title/);
  assert.match(newsletter, /onSectionPages/);
  assert.match(newsletter, /onSelect\(target\)/);
  assert.match(newsletter, /newsletter-back-to-contents/);
  assert.match(newsletter, />Back to contents</);
  assert.match(newsletter, /onClick=\{\(\)=>turn\(1\)\}/);
  assert.match(newsletter, /newsletter-book-page-left/);
  assert.match(newsletter, /newsletter-book-page-right/);
  assert.match(newsletter, /newsletter-page-turn-zone/);
  assert.match(newsletter, /onPointerDown/);
  assert.match(newsletter, /is-last-single/);
  assert.match(newsletter, /ArrowRight/);
  assert.doesNotMatch(newsletter, /Previous newsletter page/);
  assert.doesNotMatch(newsletter, /Next newsletter page/);
  assert.match(newsletter, /newsletter-flow-content/);
  assert.match(newsletter, /flow\.scrollWidth/);
  assert.match(newsletter, /Math\.ceil\(flow\.scrollWidth\/stride\)/);
  assert.doesNotMatch(newsletter, /splitNewsletterText/);
  assert.doesNotMatch(newsletter, /newsletter-page-filler/);
  assert.match(server, /\['news', 'advertisement'\]\.includes\(contributionType\) && !sourceUrl/);
  assert.match(server, /Enter a title between 3 and 120 characters/);
  assert.match(server, /contribution must be between 20 and 10,000 characters/);
  assert.match(server, /content\.length > 10000/);
  assert.match(server, /app\.get\('\/api\/newsletter\/community-submissions\/mine'/);
  assert.match(server, /Updated and resubmitted for review/);
  assert.match(server, /\.eq\('id', submissionId\)\.eq\('user_id', req\.user\.id\)/);
  assert.match(server, /renderNewsletterMarkdownForEmail\(item\.content\)/);
  assert.match(server, /By \$\{escapeEmailHtml\(item\.displayName\)\}/);
});

test('community publishing uses one formatted, previewed, and moderated workflow', async () => {
  const [testimonials, newsletter, server] = await Promise.all([
    readFile(new URL('../src/pages/Testimonials.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/Newsletter.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../server.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(testimonials, /newsletter\/community\?type=testimonial/);
  assert.doesNotMatch(testimonials, /api\/newsletter\/community-submissions/);
  for (const tool of ['Bold', 'Italic', 'Heading', 'Bulleted list', 'Numbered list', 'Quote', 'Link']) assert.match(newsletter, new RegExp(`label:'${tool}'`));
  assert.match(newsletter, /contentEditable role="textbox"/);
  assert.match(newsletter, /h-72 w-full overflow-y-auto overscroll-contain/);
  assert.match(newsletter, /Scroll inside the writing area to review and format longer content/);
  assert.match(newsletter, /editorHtmlToMarkdown/);
  assert.doesNotMatch(newsletter, /run:\(\)=>apply\('\*\*'/);
  assert.match(newsletter, /ReactMarkdown skipHtml/);
  assert.match(newsletter, /Submission preview/);
  assert.match(server, /renderNewsletterMarkdownForEmail/);
  assert.match(server, /consent_to_publish/);
});

test('newsletter navigation groups issues by newest month and opens individual issues in a new tab', async () => {
  const [app, layout, newsletter] = await Promise.all([
    readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/Layout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/Newsletter.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(app, /path="newsletter\/archive\/:month"/);
  assert.match(app, /path="newsletter\/issues\/:issueDate"/);
  assert.match(app, /path="newsletter\/subscribe"/);
  assert.match(app, /path="newsletter\/community"/);
  assert.match(layout, /Weekly archive/);
  assert.match(layout, /to="\/newsletter\/subscribe"[^>]*>.*Subscribe/);
  assert.match(layout, /Share with the community/);
  assert.match(layout, /to="\/newsletter\/community"/);
  assert.match(layout, /isNewsletterAdmin &&/);
  assert.match(layout, /newsletterMonths\.map/);
  assert.match(layout, /isArchiveMonthsOpen &&/);
  assert.match(layout, /onMouseEnter=\{\(\) => setIsArchiveMonthsOpen\(true\)\}/);
  const footer = layout.slice(layout.indexOf('<footer'), layout.indexOf('</footer>'));
  assert.doesNotMatch(footer, /to="\/newsletter"/);
  assert.match(newsletter, /monthKeys=Object\.keys\(monthGroups\)\.sort\(\(a,b\)=>b\.localeCompare\(a\)\)/);
  assert.match(newsletter, /to=\{`\/newsletter\/issues\/\$\{issue\.issue_date\}`\} target="_blank"/);
  assert.match(newsletter, /Navigate to=\{`\/newsletter\/archive\/\$\{monthKeys\[0\]\}`\}/);
  assert.doesNotMatch(newsletter, /Back to weekly archive/);
  assert.match(newsletter, /window\.close\(\)/);
  assert.match(newsletter, /Close newsletter/);
});

test('home links to the newsletter and safely exposes configured social pages', async () => {
  const [home, layout, server] = await Promise.all([
    readFile(new URL('../src/pages/Home.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/Layout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../server.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(home, /to="\/newsletter\/subscribe"/);
  assert.match(home, /Subscribe Newsletter/);
  assert.doesNotMatch(home, /Subscribe to the newsletter/);
  assert.match(home, /\/api\/public-links/);
  assert.match(server, /app\.get\('\/api\/public-links'/);
  assert.match(server, /cleanEnvVar\('FACEBOOK_URL'\)/);
  assert.match(server, /cleanEnvVar\('INSTAGRAM_URL'\)/);
  assert.match(layout, /publicLinks\.facebook/);
  assert.match(layout, /publicLinks\.instagram/);
  assert.match(layout, /text-sm font-bold text-slate-600/);
  assert.match(server, /Subscribe Newsletter', `\$\{appOrigin\}\/newsletter\/subscribe`/);
  assert.match(server, /\['Visual Steps Home', appOrigin\]/);
  assert.match(server, /\['Pricing', `\$\{appOrigin\}\/pricing`\]/);
  assert.doesNotMatch(home, /SMTP_PASS|service_role/);
});

test('weekly newsletters use a protected daily schedule check', async () => {
  const [server, vercel] = await Promise.all([
    readFile(new URL('../server.ts', import.meta.url), 'utf8'),
    readFile(new URL('../vercel.json', import.meta.url), 'utf8'),
  ]);
  assert.match(server, /CRON_SECRET/);
  assert.match(server, /\/api\/cron\/weekly-newsletter/);
  const crons = JSON.parse(vercel).crons;
  assert.equal(crons.length, 24);
  crons.forEach((cron: { path: string; schedule: string }, hour: number) => assert.deepEqual(cron, { path: `/api/cron/weekly-newsletter/${hour}`, schedule: `0 ${hour} * * *` }));
});
