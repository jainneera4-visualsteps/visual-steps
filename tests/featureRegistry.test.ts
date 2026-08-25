import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { featuresForSurface, isFeatureNew, productFeatures } from '../src/content/featureRegistry';

const requiredSurfaces = ['home', 'about', 'onboarding', 'chatbot', 'pricing', 'guest', 'help'] as const;

test('every product feature supplies synchronization metadata for all required surfaces', () => {
  assert.ok(productFeatures.length > 0);
  for (const feature of productFeatures) {
    assert.ok(feature.id && feature.title && feature.summary && feature.details && feature.familyImpact && feature.help);
    assert.ok(feature.screenshot.src && feature.screenshot.alt && feature.screenshot.caption, `${feature.id} needs screenshot metadata`);
    assert.ok(feature.guideParagraphs.length >= 2, `${feature.id} needs feature-specific guide paragraphs`);
    for (const paragraph of feature.guideParagraphs) {
      assert.ok(paragraph.length >= 250, `${feature.id} guide paragraphs should provide substantial detail`);
    }
    const sentenceCount = feature.details.match(/[.!?](?:\s|$)/g)?.length ?? 0;
    assert.ok(sentenceCount >= 4 && sentenceCount <= 5, `${feature.id} must have a four- or five-sentence explanation`);
    assert.match(feature.introducedOn, /^\d{4}-\d{2}-\d{2}$/);
    for (const update of feature.updates || []) {
      assert.match(update.updatedOn, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(update.title && update.summary && update.details && update.familyImpact, `${feature.id} has incomplete update history`);
      assert.ok(update.updatedOn >= feature.introducedOn, `${feature.id} cannot be updated before it was introduced`);
    }
    assert.ok(feature.routes.length > 0);
    for (const surface of requiredSurfaces) assert.ok(feature.surfaces.includes(surface), `${feature.id} is missing ${surface}`);
  }
  for (const surface of requiredSurfaces) assert.equal(featuresForSurface(surface).length, productFeatures.length);
  assert.equal(featuresForSurface('home').length, 11);
});

test('family-facing feature guidance avoids implementation and billing terminology', () => {
  const familyFacingCopy = productFeatures
    .flatMap((feature) => [feature.summary, feature.details, ...feature.guideParagraphs, feature.familyImpact, feature.help])
    .join(' ');
  assert.doesNotMatch(
    familyFacingCopy,
    /Supabase|API key|API costs?|database-backed|database writes?|AI spending|service role|row-level security|\bRLS\b|Vercel/i,
  );
});

test('lifespan-wide feature guidance names both children and adults', () => {
  const lifespanFeatureIds = [
    'visual-activities',
    'activity-verification',
    'behavior-bonuses',
    'curated-samples',
    'parent-assistant',
    'guest-demo',
  ];
  for (const featureId of lifespanFeatureIds) {
    const feature = productFeatures.find(item => item.id === featureId);
    assert.ok(feature, `${featureId} must remain in the feature registry`);
    const familyFacingCopy = [feature.summary, feature.details, feature.familyImpact, ...feature.guideParagraphs].join(' ');
    assert.match(familyFacingCopy, /child \/ adult/i, `${featureId} must represent autistic people across ages`);
  }
});

test('new badges last 30 days and never appear before release', () => {
  const feature = productFeatures[0];
  const dated = { ...feature, introducedOn: '2026-08-01' };
  assert.equal(isFeatureNew(dated, new Date('2026-08-01T00:00:00Z')), true);
  assert.equal(isFeatureNew(dated, new Date('2026-08-30T23:59:59Z')), true);
  assert.equal(isFeatureNew(dated, new Date('2026-08-31T00:00:00Z')), false);
  assert.equal(isFeatureNew(dated, new Date('2026-07-31T23:59:59Z')), false);
});

test('required product surfaces consume the shared feature registry', async () => {
  const files = ['Home.tsx', 'About.tsx', 'Pricing.tsx'];
  for (const file of files) {
    const source = await readFile(new URL(`../src/pages/${file}`, import.meta.url), 'utf8');
    assert.match(source, /FeatureHighlights/, `${file} is not synchronized`);
  }
  const guestWorkspace = await readFile(new URL('../src/components/GuestWorkspace.tsx', import.meta.url), 'utf8');
  assert.match(guestWorkspace, /Guest tour/);
  assert.match(guestWorkspace, /featuresForSurface\('guest'\)/);
  const onboarding = await readFile(new URL('../src/components/ParentOnboarding.tsx', import.meta.url), 'utf8');
  const server = await readFile(new URL('../server.ts', import.meta.url), 'utf8');
  assert.match(onboarding, /newFeatures/);
  assert.match(onboarding, /featuresForSurface\('onboarding'\)/);
  assert.match(server, /FEATURE_REGISTRY_SERVER:START/);
  assert.doesNotMatch(server, /import productFeatureRegistry/);
  assert.match(server, /buildWelcomeFeatureContent/);
  assert.match(server, /productFeatureRegistry\.filter\(feature => feature\.surfaces\.includes\('home'\)\)/);
  assert.match(server, /welcomeFeatures\.text/);
  assert.match(server, /welcomeFeatures\.html/);
  assert.match(server, /const latestUpdate = \('updates' in feature \? feature\.updates : \[\]\)/);
  assert.match(server, /features\/\$\{encodeURIComponent\(feature\.id\)\}/);
});

test('home feature cards link to catalog-backed detailed feature guides', async () => {
  const [app, home, about, newsletter, highlights, detail, syncScript] = await Promise.all([
    readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/Home.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/About.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/Newsletter.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/FeatureHighlights.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/FeatureDetail.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../scripts/sync-feature-docs.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(app, /path="features\/:featureId"/);
  assert.match(home, /readMore/);
  assert.match(about, /sortByTitle readMore/);
  assert.match(newsletter, /featureIdFor/);
  assert.match(newsletter, /Read more/);
  assert.match(highlights, /Read more/);
  assert.match(highlights, /features\/\$\{feature\.id\}/);
  assert.doesNotMatch(
    detail,
    /What is this feature\?|How can it help autistic people\?|How can it help parents and caregivers\?|How to use it in Visual Steps/,
  );
  assert.match(detail, /feature\.guideParagraphs/);
  assert.match(detail, /feature\.screenshot/);
  const screenshotPaths = productFeatures.map(feature => feature.screenshot.src);
  assert.equal(new Set(screenshotPaths).size, screenshotPaths.length, 'feature guides must not reuse screenshots');
  assert.equal(screenshotPaths.length, 11, 'every feature guide should use its own accurate real application capture');
  assert.match(syncScript, /feature\.guideParagraphs/);
  assert.match(syncScript, /feature\.screenshot/);
  assert.match(syncScript, /Feature screenshot is reused/);
  assert.doesNotMatch(detail, /This feature is part of the connected Visual Steps workflow/);
  assert.doesNotMatch(detail, /A useful starting point is one meaningful goal/);
  assert.doesNotMatch(detail, /After using the feature, review the outcome together/);
  assert.match(detail, /newsletter-copy surface/);
});

test('generated documentation includes every registered feature', async () => {
  const [readme, prd] = await Promise.all([
    readFile(new URL('../README.md', import.meta.url), 'utf8'),
    readFile(new URL('../PRD.md', import.meta.url), 'utf8'),
  ]);
  for (const feature of productFeatures) {
    assert.match(readme, new RegExp(feature.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(prd, new RegExp(feature.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  const quizUpdate = productFeatures.find(feature => feature.id === 'quiz-attempt-locking')?.updates?.[0];
  assert.equal(quizUpdate?.updatedOn, '2026-08-24');
  assert.match(readme, /Feature update history/);
  assert.match(prd, /Clearer quiz goals, learner preview, learning insights, and thoughtful illustrations/);
});
