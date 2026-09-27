import { expect, test } from '@playwright/test';

const parentId = '00000000-0000-4000-8000-000000000101';
const learnerId = '00000000-0000-4000-8000-000000000202';

const sizes = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];

const expectNoPageOverflow = async (page: import('@playwright/test').Page, label: string) => {
  const widths = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(widths.document, `${label}: page must not be clipped horizontally`).toBeLessThanOrEqual(widths.viewport + 1);
};

test('guest parent and learner screens fit representative widths', async ({ page }) => {
  await page.goto('/demo');
  await expect(page).toHaveURL(/\/dashboard$/);

  for (const size of sizes) {
    await page.setViewportSize(size);
    await expect(page.getByRole('banner')).toBeVisible();
    await expectNoPageOverflow(page, `parent dashboard ${size.width}`);

    if (size.width < 1024) {
      await page.getByRole('button', { name: 'Open menu' }).click();
      const menu = page.getByRole('banner').getByRole('navigation').last();
      for (const name of ['Dashboard', 'Activities', 'Rewards']) {
        await expect(menu.getByRole('link', { name, exact: true })).toBeVisible();
      }
      for (const name of ['Current', 'Completed', 'Rewards Catalog', 'Positive Recognition', 'Give Bonus Tokens']) {
        await expect(menu.getByRole('link', { name, exact: true })).toBeVisible();
      }
      await page.getByRole('button', { name: 'Close menu' }).click();
    }
  }

  await page.getByRole('link', { name: /Preview learner view/ }).click();
  for (const size of sizes) {
    await page.setViewportSize(size);
    await expect(page.getByRole('complementary', { name: 'Family messages' })).toBeVisible();
    await expectNoPageOverflow(page, `learner dashboard ${size.width}`);
  }
});

test('new activity form keeps saved activity choices compact until requested', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('banner').getByRole('navigation').last().getByRole('link', { name: 'Current' }).click();
  await page.getByRole('button', { name: 'Add Activity' }).first().click();
  const toggle = page.getByRole('button', { name: 'Learning Activity' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  const alignment = await toggle.evaluate(element => ({ buttonRight: element.getBoundingClientRect().right, rowRight: element.parentElement!.getBoundingClientRect().right }));
  expect(Math.abs(alignment.rowRight - alignment.buttonRight)).toBeLessThanOrEqual(1);
  await expect(page.locator('#saved-activity-picker')).toHaveCount(0);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#saved-activity-picker')).toBeVisible();
  await toggle.click();
  await expect(page.locator('#saved-activity-picker')).toHaveCount(0);
  const repeat = page.locator('select').filter({ has: page.locator('option[value="Weekends"]') });
  await expect(repeat.locator('option[value="Weekdays"]')).toHaveText('Weekdays (Monday–Friday)');
  await expect(repeat.locator('option[value="Weekends"]')).toHaveText('Weekends (Saturday–Sunday)');
  await repeat.selectOption('Weekends');
  await expect(repeat).toHaveValue('Weekends');
  await expectNoPageOverflow(page, 'new activity form on phone');
});

test('assigned activities grid fits desktop widths without a horizontal scrollbar', async ({ page }) => {
  await page.goto('/demo');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('banner').getByRole('navigation', { name: 'Main parent workspaces' }).getByRole('link', { name: 'Activities' }).click();
  const table = page.locator('table.app-data-table').filter({ has: page.getByRole('columnheader', { name: /Reward Amount/ }) });
  await expect(table).toBeVisible();
  for (const width of [1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await table.evaluate(element => ({
      table: element.getBoundingClientRect().width,
      container: element.parentElement!.clientWidth,
      scroll: element.parentElement!.scrollWidth,
    }));
    expect(dimensions.scroll, `grid should fit at ${width}px`).toBeLessThanOrEqual(dimensions.container + 1);
    expect(dimensions.table).toBeLessThanOrEqual(dimensions.container + 1);
  }
});

test('signed-in parent mobile menu exposes workspaces and submenus without clipping', async ({ page }) => {
  await page.route('**/auth/v1/token?grant_type=password', async route => {
    const now = Math.floor(Date.now() / 1000);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      access_token: 'responsive-test-token', refresh_token: 'responsive-test-refresh',
      token_type: 'bearer', expires_in: 3600, expires_at: now + 3600,
      user: { id: parentId, aud: 'authenticated', role: 'authenticated', email: 'parent@example.com',
        email_confirmed_at: new Date().toISOString(), app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: { name: 'Parent' }, identities: [], created_at: new Date().toISOString() },
    }) });
  });
  await page.route('**/rest/v1/users**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: parentId, email: 'parent@example.com', name: 'Parent' }) }));
  await page.route('**/api/kids', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ kids: [
    { id: learnerId, name: 'Alex', reward_balance: 5 },
    { id: '00000000-0000-4000-8000-000000000203', name: 'Sam', reward_balance: 3 },
  ] }) }));
  await page.goto('/login');
  await page.getByPlaceholder('name@example.com').fill('parent@example.com');
  await page.locator('form input[type="password"]').fill('password');
  await page.locator('form').getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('banner').getByRole('combobox', { name: 'Select Child' }).last().selectOption({ label: 'Sam' });
  await expect(page.getByRole('banner').getByLabel('Selected learner: Sam')).toBeVisible();
  await expect(page.getByText('SEND MESSAGE TO SAM')).toBeVisible();
  const dashboardHeaderOrder = await page.getByRole('banner').evaluate(element => {
    const addChild = Array.from(element.querySelectorAll('a')).find(link => link.textContent?.includes('Add Child / Adult'));
    const learner = element.querySelector('[aria-label="Selected learner: Sam"]');
    return Boolean(addChild && learner && (addChild.compareDocumentPosition(learner) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  expect(dashboardHeaderOrder).toBe(true);

  for (const size of sizes.filter(size => size.width < 1024)) {
    await page.setViewportSize(size);
    await page.getByRole('button', { name: 'Open menu' }).click();
    const menu = page.getByRole('banner').getByRole('navigation').last();
    for (const name of ['Dashboard', 'Activities', 'Rewards', 'Learning', 'Progress', 'Connect', 'Newsletter']) {
      await expect(menu.getByRole('link', { name, exact: true })).toBeVisible();
    }
    for (const name of ['Current', 'Completed', 'Rewards Catalog', 'Positive Recognition', 'Give Bonus Tokens', 'Skill Builder', 'Quizzes', 'Worksheets', 'Social Stories', 'Games', 'Activity History', 'Contact']) {
      await expect(menu.getByRole('link', { name, exact: true }).first()).toBeVisible();
    }
    await expect(menu.getByRole('link', { name: 'Plans', exact: true })).toHaveCount(0);
    await expect(menu.getByRole('link', { name: 'Testimonials', exact: true })).toHaveCount(0);
    await expect(menu.getByRole('link', { name: 'Hi, Parent', exact: true })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Parent Profile', exact: true })).toHaveCount(0);
    await expect(menu.getByRole('link', { name: 'Add Child / Adult', exact: true })).toHaveCount(0);
    await expect(menu.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await expect(page.getByRole('banner').getByLabel('Selected learner: Sam')).toBeInViewport();
    await menu.getByRole('button', { name: 'Sign out' }).scrollIntoViewIfNeeded();
    await expect(menu.getByRole('link', { name: 'Hi, Parent', exact: true })).toBeInViewport();
    await expect(menu.getByRole('button', { name: 'Sign out' })).toBeInViewport();
    const panelBounds = await menu.evaluate(element => {
      const panel = element.parentElement!;
      const bounds = panel.getBoundingClientRect();
      return { bottom: bounds.bottom, viewport: window.innerHeight, scrolls: panel.scrollHeight > panel.clientHeight };
    });
    expect(panelBounds.bottom).toBeLessThanOrEqual(panelBounds.viewport + 1);
    expect(panelBounds.scrolls).toBe(true);
    await expectNoPageOverflow(page, `parent mobile menu ${size.width}`);
    await page.getByRole('button', { name: 'Close menu' }).click();
  }

  await page.goto('/saved-quizzes');
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileHeader = page.getByRole('banner');
  await expect(mobileHeader.getByRole('navigation', { name: 'learning workspace navigation' }).getByRole('link', { name: 'Skill Builder' })).toBeVisible();
  await expect(mobileHeader.getByRole('button', { name: 'Start tour' })).toBeVisible();
  await expect(mobileHeader.getByRole('combobox', { name: 'Select Child' }).last()).toBeVisible();
  await expect(mobileHeader.getByRole('link', { name: 'Add Child / Adult' })).toBeVisible();
  const controlsBeforeLearner = await mobileHeader.evaluate(element => {
    const addChild = Array.from(element.querySelectorAll('a')).find(link => link.textContent?.includes('Add Child / Adult'));
    const learner = element.querySelector('[aria-label="Selected learner: Sam"]');
    return Boolean(addChild && learner && (addChild.compareDocumentPosition(learner) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  expect(controlsBeforeLearner).toBe(true);
});
