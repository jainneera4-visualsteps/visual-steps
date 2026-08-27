import { expect, test, type Page } from '@playwright/test';

const expectNoHorizontalOverflow = async (page: Page) => {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test('home page renders parent login and public navigation', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('Login | Visual Steps');
  await expect(page.getByRole('heading', { name: /Make every day feel more possible/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Parent Login' })).toBeVisible();
  await expect(page.getByPlaceholder('name@example.com')).toBeVisible();
  await expect(page.locator('form').getByRole('button', { name: 'Sign In' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'About' })).toBeVisible();
});

test('offline status is clearly shown and clears after reconnecting', async ({ page, context }) => {
  await page.goto('/');

  await context.setOffline(true);
  await expect(page.getByRole('status')).toContainText('You are offline');

  await context.setOffline(false);
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('a valid controlled sharing link opens only the shared social story', async ({ page }) => {
  const token = 'a'.repeat(43);
  await page.route(`**/api/shared/social-stories/${token}`, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      shared: true,
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      story: {
        id: 'story-1',
        title: 'Visiting the Library',
        content: JSON.stringify({ pages: [{ text: 'I can use a quiet voice.', imageUrl: '' }] }),
        created_at: new Date().toISOString(),
      },
    }),
  }));

  await page.goto(`/social-stories/shared/${token}`);
  await expect(page.getByRole('heading', { name: 'Visiting the Library' })).toBeVisible();
  await expect(page.getByText('I can use a quiet voice.')).toBeVisible();
});

test('parent login fields enforce browser validation and password visibility', async ({ page }) => {
  await page.goto('/login');

  const form = page.locator('form');
  const email = page.getByPlaceholder('name@example.com');
  const password = form.locator('input').nth(1);

  await expect(form.evaluate((element: HTMLFormElement) => element.checkValidity())).resolves.toBe(false);
  await email.fill('parent@example.com');
  await password.fill('secret-password');
  await expect(form.evaluate((element: HTMLFormElement) => element.checkValidity())).resolves.toBe(true);

  await form.locator('button[type="button"]').click();
  await expect(password).toHaveAttribute('type', 'text');
  await expect(password).toHaveValue('secret-password');
});

test('kid login lookup renders mocked children without contacting Supabase', async ({ page }) => {
  await page.route('**/api/kids/by-parent-email', async route => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({ email: 'parent@example.com' });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ kids: [{ id: 'kid-1', name: 'Alex' }, { id: 'kid-2', name: 'Sam' }] }),
    });
  });

  await page.goto('/?mode=kid');
  await expect(page.getByRole('button', { name: 'Kid Login' })).toBeVisible();

  await page.getByPlaceholder('parent@example.com').fill('parent@example.com');
  await page.locator('form button[type="button"]').click();

  const kidSelect = page.locator('select');
  await expect(kidSelect.locator('option')).toHaveCount(3);
  await expect(kidSelect.locator('option').nth(1)).toHaveText('Alex');
  await expect(kidSelect.locator('option').nth(2)).toHaveText('Sam');
  await kidSelect.selectOption('kid-2');
  await expect(page.getByPlaceholder('Enter your code')).toBeEnabled();
});

test('kid lookup displays a mocked empty-state error', async ({ page }) => {
  await page.route('**/api/kids/by-parent-email', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ kids: [] }),
  }));

  await page.goto('/?mode=kid');
  await page.getByPlaceholder('parent@example.com').fill('nobody@example.com');
  await page.locator('form button[type="button"]').click();
  await expect(page.getByText('No kids found for this parent email.')).toBeVisible();
});

test('signup and forgot-password pages support public form flows', async ({ page }) => {
  await page.goto('/signup');
  await expect(page).toHaveTitle('Sign Up | Visual Steps');
  await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
  await expect(page.getByPlaceholder('John Doe')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign Up' })).toBeVisible();

  await page.route('**/auth/v1/recover*', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({}),
  }));
  await page.goto('/forgot-password');
  await expect(page).toHaveTitle('Forgot Password | Visual Steps');
  await page.getByPlaceholder('name@example.com').fill('parent@example.com');
  await page.getByRole('button', { name: 'Send Reset Link' }).click();
  await expect(page.getByText(/If an account exists for parent@example.com/)).toBeVisible();
});

test('signup with email confirmation displays the correct success state', async ({ page }) => {
  await page.route('**/auth/v1/signup', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: '00000000-0000-4000-8000-000000000001',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'new-parent@example.com',
      user_metadata: { name: 'New Parent' },
      identities: [],
      created_at: new Date().toISOString(),
    }),
  }));
  await page.route('**/api/auth/create-profile', route => route.fulfill({
    status: 201,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Profile created', emailSent: true }),
  }));

  await page.goto('/signup');
  const form = page.locator('form');
  await page.getByPlaceholder('John Doe').fill('New Parent');
  await page.getByPlaceholder('name@example.com').fill('new-parent@example.com');
  await form.locator('input[type="password"]').fill('secure-password');
  await form.getByRole('button', { name: 'Sign Up' }).click();

  await expect(page.getByText('Account created!')).toBeVisible();
  await expect(page.getByText('Your account was created successfully. Confirm your email before signing in.')).toBeVisible();
  await expect(page.getByText(/A welcome email was sent to/)).toContainText('new-parent@example.com');
  await expect(page.getByRole('button', { name: 'Continue to Sign In' })).toBeVisible();
  await expect(page).toHaveURL(/\/signup$/);
});

test('unauthenticated parent and child routes redirect to their login modes', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: 'Parent Login' })).toBeVisible();

  await page.goto('/kids-dashboard/kid-1');
  await expect(page).toHaveURL(/\/?\?mode=kid$/);
  await expect(page.getByPlaceholder('parent@example.com')).toBeVisible();
});

test('about page navigation and mobile layout remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/about');
  await expect(page).toHaveTitle('About | Visual Steps');
  await expect(page.getByRole('heading', { name: 'About Visual Steps' })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: 'Get started free' }).click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('plans page presents only the currently available free membership', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page).toHaveTitle('Plans & Pricing | Visual Steps');
  await expect(page.getByRole('heading', { name: /Start using Visual Steps for free/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Starter' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Family', exact: true })).toHaveCount(0);
  await expect(page.getByText('There is no checkout or paid subscription.', { exact: false })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('public pages do not emit unexpected browser errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/');
  await page.goto('/signup');
  await page.goto('/about');
  await page.goto('/pricing');
  expect(errors).toEqual([]);
});
