import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { featuresForSurface, isFeatureNew, productFeatures } from '../src/content/featureRegistry';

const requiredSurfaces = ['home', 'about', 'onboarding', 'chatbot', 'pricing', 'guest', 'help'] as const;

test('every product feature supplies synchronization metadata for all required surfaces', () => {
  assert.ok(productFeatures.length > 0);
  for (const feature of productFeatures) {
    assert.ok(feature.id && feature.title && feature.summary && feature.help);
    assert.match(feature.introducedOn, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(feature.routes.length > 0);
    for (const surface of requiredSurfaces) assert.ok(feature.surfaces.includes(surface), `${feature.id} is missing ${surface}`);
  }
  for (const surface of requiredSurfaces) assert.equal(featuresForSurface(surface).length, productFeatures.length);
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
  const files = ['Home.tsx', 'About.tsx', 'Pricing.tsx', 'GuestDemo.tsx'];
  for (const file of files) {
    const source = await readFile(new URL(`../src/pages/${file}`, import.meta.url), 'utf8');
    assert.match(source, /FeatureHighlights/, `${file} is not synchronized`);
  }
  const onboarding = await readFile(new URL('../src/components/ParentOnboarding.tsx', import.meta.url), 'utf8');
  const server = await readFile(new URL('../server.ts', import.meta.url), 'utf8');
  assert.match(onboarding, /newFeatures/);
  assert.match(server, /FEATURE_REGISTRY_SERVER:START/);
  assert.doesNotMatch(server, /import productFeatureRegistry/);
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
});
