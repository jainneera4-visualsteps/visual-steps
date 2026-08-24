import { expect, test, type Page } from '@playwright/test';

const parent = {
  id: '00000000-0000-4000-8000-000000000101',
  email: 'mock-parent@example.com',
  name: 'Mock Parent',
};

const learner = {
  id: '00000000-0000-4000-8000-000000000202',
  name: 'Alex',
  dob: '1990-09-01',
  grade_level: 'Functional reading',
  interests: 'Space and public transportation',
  strengths: 'Visual matching',
  weaknesses: 'Long instructions',
};

const mockAuthenticatedParent = async (page: Page) => {
  await page.route('**/auth/v1/token?grant_type=password', async route => {
    const now = Math.floor(Date.now() / 1000);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-browser-access-token',
        refresh_token: 'mock-browser-refresh-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: now + 3600,
        user: {
          id: parent.id,
          aud: 'authenticated',
          role: 'authenticated',
          email: parent.email,
          email_confirmed_at: new Date().toISOString(),
          app_metadata: { provider: 'email', providers: ['email'] },
          user_metadata: { name: parent.name },
          identities: [],
          created_at: new Date().toISOString(),
        },
      }),
    });
  });

  await page.route('**/rest/v1/users**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(parent),
  }));

  await page.route('**/api/kids', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ kids: [learner] }),
  }));

  await page.route(`**/api/kids/${learner.id}`, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ kid: learner }),
  }));

  await page.goto('/login');
  const form = page.locator('form');
  await page.getByPlaceholder('name@example.com').fill(parent.email);
  await form.locator('input[type="password"]').fill('mock-password');
  await form.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test('quiz generation and AI Art render mocked content in the browser', async ({ page }) => {
  const requests: Array<Record<string, any>> = [];
  const imageDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/69u2WQAAAABJRU5ErkJggg==';

  await mockAuthenticatedParent(page);
  await page.route('**/api/image-generation/usage', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ allowance: { used: 0, remaining: 10, dailyLimit: 10, resetsAt: '2026-08-25T00:00:00.000Z' } }),
  }));
  await page.route('**/api/generate', async route => {
    const body = route.request().postDataJSON() as Record<string, any>;
    requests.push(body);

    const text = body.model === 'gemini-2.5-flash-image'
      ? imageDataUrl
      : JSON.stringify({
          title: 'Mocked Space Quiz',
          description: 'A safe browser-test quiz.',
          questions: [{
            question: 'Which planet is known as the Red Planet?',
            options: ['Earth', 'Mars', 'Venus'],
            correctAnswerIndices: [1],
            explanation: 'Mars appears red because of iron minerals in its soil.',
            visualPrompt: 'A simple line drawing of Mars in space',
          }],
        });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body.model === 'gemini-2.5-flash-image'
        ? { text, allowance: { used: 1, remaining: 9, dailyLimit: 10, resetsAt: '2026-08-25T00:00:00.000Z' } }
        : { text }),
    });
  });

  await page.goto('/quiz-generator');
  await page.getByLabel('Child / adult profile *').selectOption(learner.id);
  await page.getByLabel('Learning goal or topic *').fill('Space');
  await page.getByLabel('Learning objective *').fill('Identify Mars as the planet known for its red appearance');
  await page.getByRole('button', { name: 'Generate Quiz' }).click();

  await expect(page.getByRole('heading', { name: 'Mocked Space Quiz' })).toBeVisible();
  await expect(page.getByText('Which planet is known as the Red Planet?')).toBeVisible();
  await expect(page.getByText('Mars', { exact: true })).toBeVisible();
  await expect(page.getByText(/Mars appears red because/)).toBeVisible();

  await page.getByRole('button', { name: 'AI Art' }).click();
  const illustration = page.getByRole('img', { name: 'Question illustration' });
  await expect(illustration).toBeVisible();
  await expect(illustration).toHaveAttribute('src', imageDataUrl);
  await expect(illustration).toHaveCSS('object-fit', 'contain');

  await page.getByRole('button', { name: 'Review & Edit' }).click();
  await page.getByLabel('Question 1 text').fill('Which world is called the Red Planet?');
  await page.getByLabel('Question 1 explanation').fill('Mars looks red because iron minerals in its soil have oxidized.');
  await page.getByRole('button', { name: 'Finish Review' }).click();
  await expect(page.getByText('Which world is called the Red Planet?')).toBeVisible();

  await page.getByRole('button', { name: 'Preview as Learner' }).click();
  await expect(page.getByRole('dialog', { name: 'Learner quiz preview' })).toBeVisible();
  await expect(page.getByText('Parent preview · Nothing will be saved')).toBeVisible();
  await expect(page.getByText(/Today’s goal:.*Identify Mars/)).toBeVisible();
  await page.getByRole('button', { name: 'Mars', exact: true }).click();
  await page.getByRole('button', { name: 'Check Answer' }).click();
  await expect(page.getByText('Correct!', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View Results' }).click();
  await expect(page.getByText('Preview score: 1 of 1')).toBeVisible();
  await expect(page.getByText(/not recorded and no rewards were changed/)).toBeVisible();
  await page.getByRole('button', { name: 'Return to parent review' }).click();
  await expect(page.getByRole('dialog', { name: 'Learner quiz preview' })).toBeHidden();

  expect(requests).toHaveLength(2);
  expect(requests[0].model).toBe('gemini-3-flash-preview');
  expect(requests[0].prompt).toContain('Space');
  expect(requests[0].prompt).toContain('Functional reading');
  expect(requests[0].prompt).not.toContain('Grade 1');
  expect(requests[1].model).toBe('gemini-2.5-flash-image');
  expect(requests[1].prompt).toContain('simple line drawing of Mars');
});

test('quiz generator stops loading and displays a mocked AI quota error', async ({ page }) => {
  await mockAuthenticatedParent(page);
  await page.route('**/api/image-generation/usage', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ allowance: { used: 0, remaining: 10, dailyLimit: 10, resetsAt: '2026-08-25T00:00:00.000Z' } }),
  }));
  await page.route('**/api/generate', route => route.fulfill({
    status: 400,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Quota Exceeded: mocked browser failure' }),
  }));

  await page.goto('/quiz-generator');
  await page.getByLabel('Child / adult profile *').selectOption(learner.id);
  await page.getByLabel('Learning goal or topic *').fill('Oceans');
  await page.getByLabel('Learning objective *').fill('Name one feature of an ocean habitat');

  const alertPromise = page.waitForEvent('dialog');
  await page.getByRole('button', { name: 'Generate Quiz' }).click();
  const dialog = await alertPromise;
  expect(dialog.message()).toContain('today’s allowance has been reached');
  await dialog.accept();

  await expect(page.getByRole('button', { name: 'Generate Quiz' })).toBeEnabled();
  await expect(page.getByText('No Quiz Generated Yet')).toBeVisible();
});
