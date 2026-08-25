import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const baseUrl = process.env.ONBOARDING_CAPTURE_URL || 'http://127.0.0.1:4173';
const captureOnly = process.env.ONBOARDING_CAPTURE_ONLY || '';
const outputDirectory = resolve('public/onboarding');
const captures = [
  ['dashboard', '/dashboard'],
  ['child-profile', '/add-kid'],
  ['activities', '/assigned-activities/22222222-2222-4222-8222-222222222222'],
  ['learning', '/saved-quizzes'],
  ['progress', '/progress-report/22222222-2222-4222-8222-222222222222'],
  ['data-management', '/data-management'],
];

const featureCaptures = [
  ['activity-verification', '/assigned-activities/22222222-2222-4222-8222-222222222222', async (page) => {
    await page.getByRole('button', { name: /^Verify \(/ }).click();
  }],
  ['behavior-bonuses', '/assigned-activities/22222222-2222-4222-8222-222222222222', async (page) => {
    await page.getByRole('button', { name: 'Rewards', exact: true }).click();
  }],
  ['quiz-attempt', '/saved-quizzes', async (page) => {
    await page.getByText('Open sample', { exact: true }).first().click();
    await page.waitForTimeout(500);
  }],
  ['social-story-sharing', '/social-stories', async () => {}],
];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(baseUrl, { waitUntil: 'networkidle' });

const assistantButton = page.getByRole('button', { name: /open parent ai assistant/i });
if (!captureOnly && await assistantButton.count()) {
  await assistantButton.click();
  await page.waitForTimeout(350);
  await page.screenshot({ path: resolve(outputDirectory, 'parent-assistant.png'), fullPage: false });
  await page.getByRole('button', { name: /close assistant/i }).click();
}

await page.getByRole('button', { name: /continue as guest/i }).click();
await page.waitForURL(/\/dashboard/);
const closeHints = page.getByRole('button', { name: /close hints/i });
if (await closeHints.count()) await closeHints.click();

const visit = async (route) => {
  await page.evaluate((nextRoute) => {
    window.history.pushState({}, '', nextRoute);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, route);
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    document.querySelectorAll('div.fixed').forEach((element) => {
      if (element.textContent?.includes('Guest · Nothing saved')) element.style.display = 'none';
    });
  });
};

for (const [name, route] of captures) {
  if (captureOnly && name !== captureOnly) continue;
  await visit(route);
  await page.screenshot({ path: resolve(outputDirectory, `${name}.png`), fullPage: false });
}

for (const [name, route, prepare] of featureCaptures) {
  if (captureOnly && name !== captureOnly) continue;
  await visit(route);
  await prepare(page);
  await page.waitForTimeout(350);
  await page.screenshot({ path: resolve(outputDirectory, `${name}.png`), fullPage: false });
}

await browser.close();
