import { expect, test, type Page } from '@playwright/test';

const parent = {
  id: '00000000-0000-4000-8000-000000000101',
  email: 'mock-parent@example.com',
  name: 'Mock Parent',
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
    body: JSON.stringify({ kids: [] }),
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
      body: JSON.stringify({ text }),
    });
  });

  await page.goto('/quiz-generator');
  await page.getByPlaceholder('e.g., Animals, Space, Math...').fill('Space');
  await page.getByRole('button', { name: 'Generate Quiz' }).click();

  await expect(page.getByRole('heading', { name: 'Mocked Space Quiz' })).toBeVisible();
  await expect(page.getByText('Which planet is known as the Red Planet?')).toBeVisible();
  await expect(page.getByText('Mars', { exact: true })).toBeVisible();
  await expect(page.getByText(/Mars appears red because/)).toBeVisible();

  await page.getByRole('button', { name: 'AI Art' }).click();
  const illustration = page.getByRole('img', { name: 'Question illustration' });
  await expect(illustration).toBeVisible();
  await expect(illustration).toHaveAttribute('src', imageDataUrl);

  expect(requests).toHaveLength(2);
  expect(requests[0].model).toBe('gemini-3-flash-preview');
  expect(requests[0].prompt).toContain('Space');
  expect(requests[1].model).toBe('gemini-2.5-flash-image');
  expect(requests[1].prompt).toContain('simple line drawing of Mars');
});

test('quiz generator stops loading and displays a mocked AI quota error', async ({ page }) => {
  await mockAuthenticatedParent(page);
  await page.route('**/api/generate', route => route.fulfill({
    status: 400,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Quota Exceeded: mocked browser failure' }),
  }));

  await page.goto('/quiz-generator');
  await page.getByPlaceholder('e.g., Animals, Space, Math...').fill('Oceans');

  const alertPromise = page.waitForEvent('dialog');
  await page.getByRole('button', { name: 'Generate Quiz' }).click();
  const dialog = await alertPromise;
  expect(dialog.message()).toContain('exceeded your AI service quota');
  await dialog.accept();

  await expect(page.getByRole('button', { name: 'Generate Quiz' })).toBeEnabled();
  await expect(page.getByText('No Quiz Generated Yet')).toBeVisible();
});
