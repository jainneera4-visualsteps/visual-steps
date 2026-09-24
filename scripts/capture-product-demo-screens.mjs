import { chromium } from '@playwright/test';

const baseUrl = process.env.DEMO_BASE_URL || 'http://localhost:3000';
const output = 'public/demo-guest';
const kidId = '22222222-2222-4222-8222-222222222222';

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(8_000);
await page.addStyleTag({ content: 'footer { display: none !important; }' });

async function settle() {
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.evaluate(() => document.fonts?.ready);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
}

async function capture(name) {
  await settle();
  await page.screenshot({ path: `${output}/${name}.jpg`, type: 'jpeg', quality: 92 });
  console.log(`Captured ${name}`);
}

try {
  await page.goto(baseUrl);
  await page.getByRole('button', { name: 'Continue as Guest' }).click();
  await page.waitForURL('**/dashboard');
  await capture('01-start');
  await page.screenshot({ path: 'public/onboarding/dashboard.png', type: 'png' });

  await page.getByRole('link', { name: 'Use and edit this activity' }).click();
  await page.getByRole('heading', { name: 'New Activity' }).waitFor();
  await capture('02-edit');
  await page.screenshot({ path: 'public/onboarding/activities.png', type: 'png' });
  await page.getByRole('link', { name: 'Dashboard' }).click();
  await page.getByRole('link', { name: 'Preview learner view' }).click();
  await page.getByText('Morning routine', { exact: true }).click();
  await page.getByRole('heading', { name: 'View Activity Details' }).waitFor();
  await capture('03-learner');

  await page.goBack();
  await page.goBack();
  await page.getByRole('link', { name: 'Rewards' }).click();
  await page.getByRole('button', { name: 'Add Reward Item' }).click();
  await page.getByRole('heading', { name: 'New Reward Item' }).waitFor();
  await page.getByPlaceholder('e.g., 15 mins Screen Time').fill('Choose a favorite game');
  await capture('04-add-reward');

  await page.getByRole('button', { name: 'Back to List' }).click();
  await page.getByRole('link', { name: 'Positive Recognition' }).click();
  await page.getByText('Positive Recognition', { exact: true }).first().waitFor();
  await capture('05-recognition');
  await page.screenshot({ path: 'public/onboarding/behavior-bonuses.png', type: 'png' });

  await page.goto(`${baseUrl}/signup`);
  await page.getByRole('heading', { name: 'Create an account' }).waitFor();
  await capture('06-sign-up');

  await page.goto(baseUrl);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: 'Open Visual Steps video' }).click();
  await page.getByRole('dialog', { name: 'Open the Visual Steps website' }).waitFor();
  await settle();
  await page.screenshot({ path: '/tmp/visual-steps-product-demo-review.jpg', type: 'jpeg', quality: 92 });
  console.log('Captured final tour review');
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
