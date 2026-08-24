import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const baseUrl = process.env.ONBOARDING_CAPTURE_URL || 'http://127.0.0.1:4173';
const outputDirectory = resolve('public/onboarding');
const captures = [
  ['dashboard', '/dashboard'],
  ['child-profile', '/add-kid'],
  ['activities', '/assigned-activities/22222222-2222-4222-8222-222222222222'],
  ['learning', '/saved-quizzes'],
  ['progress', '/progress-report/22222222-2222-4222-8222-222222222222'],
];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(baseUrl, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /continue as guest/i }).click();
await page.waitForURL(/\/dashboard/);
const closeHints = page.getByRole('button', { name: /close hints/i });
if (await closeHints.count()) await closeHints.click();

for (const [name, route] of captures) {
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
  await page.screenshot({ path: resolve(outputDirectory, `${name}.png`), fullPage: false });
}

await browser.close();
