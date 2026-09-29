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
  const activityForm = page.locator('#activity-details-form');
  await expect(activityForm.getByText('Offer as')).toHaveCount(0);
  await expect(activityForm.getByRole('button', { name: 'Add Activity' })).toBeVisible();
  await expect(activityForm.getByRole('button', { name: 'Cancel' })).toBeVisible();
  await expect(activityForm.locator('[aria-label="Activity form actions"]')).toBeVisible();
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

test('assigned activity filters search name, category, and repeat together', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('banner').getByRole('navigation', { name: 'Main parent workspaces' }).getByRole('link', { name: 'Activities' }).click();
  const search = page.getByRole('searchbox', { name: 'Search assigned activities' });
  const category = page.getByRole('combobox', { name: 'Filter assigned activities by category' });
  const repeat = page.getByRole('combobox', { name: 'Filter assigned activities by repeat' });
  const table = page.locator('table.app-data-table').filter({ has: page.getByRole('columnheader', { name: /Reward Amount/ }) });

  await expect(table.getByRole('row', { name: /Morning routine/ })).toBeVisible();
  await expect(table.getByRole('row', { name: /Read for 15 minutes/ })).toBeVisible();
  await search.fill('backpack');
  await expect(table.getByRole('row', { name: /Morning routine/ })).toBeVisible();
  await expect(table.getByRole('row', { name: /Read for 15 minutes/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear search assigned activities' }).click();
  await expect(search).toHaveValue('');
  await category.selectOption('Learning');
  await expect(table.getByRole('row', { name: /Read for 15 minutes/ })).toBeVisible();
  await expect(table.getByRole('row', { name: /Morning routine/ })).toHaveCount(0);
  await category.selectOption('All');
  await repeat.selectOption('Daily');
  await expect(table.getByRole('row', { name: /Morning routine/ })).toBeVisible();
  await expect(table.getByRole('row', { name: /Read for 15 minutes/ })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(search).toBeVisible();
  await expect(category).toBeVisible();
  await expect(repeat).toBeVisible();
  await expectNoPageOverflow(page, 'assigned filters on phone');
});

test('Search All Activities waits for a query and groups matching activity records', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop-chromium', 'This flow starts from desktop workspace navigation, then checks phone width.');
  await page.goto('/demo');
  await page.getByRole('banner').getByRole('navigation', { name: 'Main parent workspaces' }).getByRole('link', { name: 'Activities' }).click();
  await page.getByRole('link', { name: 'Search All Activities' }).click();
  const search = page.getByRole('searchbox', { name: 'Search all activities' });
  await expect(page.getByText('Enter a search to see activities from every section.')).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
  await search.fill('Morning routine');
  await expect(page.getByRole('region', { name: 'Current search results' }).getByRole('row', { name: /Morning routine/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View Morning routine' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear search all activities' }).click();
  await expect(search).toHaveValue('');
  await expect(page.getByRole('table')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoPageOverflow(page, 'Search All Activities on phone');
});

test('Search All Activities sorts and paginates matching results', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop-chromium', 'This flow starts from desktop workspace navigation.');
  await page.goto('/demo');
  await page.evaluate(async () => {
    const modulePath = '/src/guest/guestSession.ts';
    const { guestApiFetch } = await import(/* @vite-ignore */ modulePath);
    for (let index = 0; index < 14; index++) {
      await guestApiFetch('/api/activities', { method: 'POST', body: JSON.stringify({ activityType: `Search sample ${index}`, category: 'Learning', description: 'Search pagination example', status: index < 8 ? 'pending' : 'completed' }) });
    }
  });
  await page.getByRole('banner').getByRole('navigation', { name: 'Main parent workspaces' }).getByRole('link', { name: 'Activities' }).click();
  await page.getByRole('link', { name: 'Search All Activities' }).click();
  await page.getByRole('searchbox', { name: 'Search all activities' }).fill('Search sample');
  const current = page.getByRole('region', { name: 'Current search results' });
  await current.getByRole('button', { name: 'Activity', exact: true }).click();
  await expect(page.getByText('Page 1 of 2')).toBeVisible();
  await expect(current.getByRole('row').nth(1)).toContainText('Search sample 0');
  await expect(page.getByRole('region', { name: 'Completed search results' }).getByRole('row')).toHaveCount(3);
  await expect(page.locator('section[aria-label$="search results"] tbody tr')).toHaveCount(10);
  await page.getByRole('button', { name: 'Next search results page' }).click();
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
  await expect(page.locator('section[aria-label$="search results"] tbody tr')).toHaveCount(4);
  await page.getByRole('combobox', { name: 'Search results per page' }).selectOption('20');
  await expect(page.getByRole('region', { name: 'Completed search results' }).getByRole('row', { name: /Search sample 11/ })).toBeVisible();
  await expect(page.locator('section[aria-label$="search results"] tbody tr')).toHaveCount(14);
  await expect(page.getByText('Page 1 of 2')).toHaveCount(0);
});

test('viewing a cancelled activity shows its saved reason in parent details', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop-chromium', 'This flow starts from desktop workspace navigation.');
  await page.goto('/demo');
  await page.getByRole('banner').getByRole('navigation', { name: 'Main parent workspaces' }).getByRole('link', { name: 'Activities' }).click();
  await page.getByRole('button', { name: 'Change availability for Morning routine' }).click();
  const dialog = page.getByRole('dialog', { name: /Change availability/ });
  await dialog.getByRole('radio', { name: /Cancelled/ }).check();
  await dialog.getByRole('textbox', { name: 'What should the learner know?' }).fill('The plan changed today.');
  await dialog.getByRole('button', { name: 'Save change' }).click();
  await page.getByRole('row', { name: /Morning routine/ }).getByRole('button', { name: 'View Morning routine' }).click();
  await expect(page.getByRole('region', { name: 'Parent planning details' })).toContainText('Cancelled');
  await expect(page.getByRole('region', { name: 'Parent planning details' })).toContainText('The plan changed today.');
});

test('calendar-selected assigned date totals planned rewards, including temporary changes but excluding cancellations', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop-chromium', 'This flow starts from the desktop workspace navigation, then checks phone width.');
  await page.goto('/demo');
  await page.getByRole('banner').getByRole('navigation', { name: 'Main parent workspaces' }).getByRole('link', { name: 'Activities' }).click();
  await page.locator('button[data-guest-tour="calendar-view"]').click();
  const day = Number((await page.evaluate(() => new Date().toISOString().slice(0, 10))).slice(-2));
  await page.locator('.grid.grid-cols-7 > div.cursor-pointer').filter({ has: page.locator('span.absolute').filter({ hasText: new RegExp(`^${day}$`) }) }).click();
  await expect(page.getByText('Planned rewards: +3 Stickers')).toBeVisible();
  await page.getByRole('combobox', { name: 'Filter assigned activities by repeat' }).selectOption('Daily');
  await expect(page.getByText('Planned rewards: +3 Stickers')).toBeVisible();
  await page.getByRole('button', { name: 'Change availability for Morning routine' }).click();
  const dialog = page.getByRole('dialog', { name: /Change availability/ });
  await dialog.getByRole('radio', { name: /Unavailable for now/ }).check();
  await dialog.getByRole('textbox', { name: 'What should the learner know?' }).fill('The materials are not ready yet.');
  await dialog.getByRole('button', { name: 'Save change' }).click();
  await expect(page.getByText('Planned rewards: +3 Stickers')).toBeVisible();
  await page.getByRole('button', { name: 'Change availability for Morning routine' }).click();
  await dialog.getByRole('radio', { name: /Cancelled/ }).check();
  await dialog.getByRole('textbox', { name: 'What should the learner know?' }).fill('This activity is not happening today.');
  await dialog.getByRole('button', { name: 'Save change' }).click();
  await expect(page.getByText('Planned rewards: +1 Sticker')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText('Planned rewards: +1 Sticker')).toBeVisible();
  await expectNoPageOverflow(page, 'selected-day reward estimate on phone');
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

test('Not Chosen uses the standard searchable and paginated activity grid', async ({ page }) => {
  await page.goto('/demo');
  await page.evaluate(async () => {
    const modulePath = '/src/guest/guestSession.ts';
    const { guestApiFetch } = await import(/* @vite-ignore */ modulePath);
    for (let index = 0; index < 12; index++) {
      await guestApiFetch('/api/activities', {
        method: 'POST',
        body: JSON.stringify({
          activityType: index === 0 ? 'Morning recap' : `Practice ${index}`,
          category: index === 0 ? 'Daily Living' : 'Learning',
          repeatFrequency: index === 0 ? 'Daily' : 'Weekly',
          description: index === 0 ? 'Talk about the morning.' : 'Practice a familiar step.',
          status: 'not_chosen',
          not_chosen_reason: 'day_ended',
        }),
      });
    }
  });
  await page.getByRole('banner').getByRole('navigation', { name: 'Main parent workspaces' }).getByRole('link', { name: 'Activities' }).click();
  await page.getByRole('link', { name: 'Not Chosen', exact: true }).click();

  const table = page.locator('table.app-data-table').filter({ has: page.getByRole('columnheader', { name: 'Reason' }) });
  await expect(table.getByRole('columnheader', { name: 'Description' })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Repeat' })).toBeVisible();
  await expect(page.getByText('Page 1 of 2')).toBeVisible();
  const search = page.getByRole('searchbox', { name: 'Search not chosen activities' });
  await search.fill('morning recap');
  await expect(table.getByRole('row', { name: /Morning recap/ })).toBeVisible();
  await expect(table.getByRole('row', { name: /Practice 1/ })).toHaveCount(0);
  await search.fill('');
  await page.getByRole('combobox', { name: 'Filter not chosen activities by category' }).selectOption('Daily Living');
  await expect(table.getByRole('row', { name: /Morning recap/ })).toBeVisible();
  await page.getByRole('combobox', { name: 'Filter not chosen activities by category' }).selectOption('All');
  await page.getByRole('combobox', { name: 'Filter not chosen activities by repeat' }).selectOption('Daily');
  await expect(table.getByRole('row', { name: /Morning recap/ })).toBeVisible();
  await expect(table.getByRole('row', { name: /Practice 1/ })).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 900 });
  const gridWidths = await table.evaluate(element => ({ container: element.parentElement!.clientWidth, scroll: element.parentElement!.scrollWidth }));
  expect(gridWidths.scroll, 'Not Chosen should fit a standard desktop width').toBeLessThanOrEqual(gridWidths.container + 1);
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoPageOverflow(page, 'Not Chosen grid on phone');
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
