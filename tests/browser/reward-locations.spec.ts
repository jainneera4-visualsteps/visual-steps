import { test, expect } from '@playwright/test';

test('parent sets one current reward location through the Add/Edit form', async ({ page }) => {
  await page.goto('/demo');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('link', { name: 'Reward Locations', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Reward Locations/ })).toBeVisible();

  await page.getByRole('button', { name: 'Add Location' }).click();
  await expect(page.getByRole('heading', { name: 'New Reward Location' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Location Name' }).fill('Restaurant');
  await expect(page.getByRole('radio', { name: 'Make this the current location' })).toBeChecked();
  await page.getByRole('button', { name: 'Add Location' }).click();
  const restaurant = page.getByRole('row').filter({ hasText: 'Restaurant' });
  await expect(restaurant.locator('svg')).toHaveCount(3);

  await page.getByRole('button', { name: 'Edit Home' }).click();
  await expect(page.getByRole('radio', { name: 'Make this the current location' })).not.toBeChecked();
  await page.getByRole('radio', { name: 'Make this the current location' }).check();
  await page.getByRole('button', { name: 'Save Changes' }).click();
  const home = page.getByRole('row').filter({ hasText: 'Home' });
  await expect(home.locator('svg')).toHaveCount(3);
  await expect(page.getByRole('button', { name: /Clear location|Set current/i })).toHaveCount(0);
});

test('catalog filter lists No location and saved places without legacy choices', async ({ page }) => {
  await page.goto('/demo');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('link', { name: 'Rewards Catalog', exact: true }).click();
  const filter = page.getByRole('combobox', { name: 'Filter rewards by location' });
  await expect(filter).toBeVisible();
  await expect(filter.locator('option')).toHaveText(['Select location', 'No location', 'Home']);
});
