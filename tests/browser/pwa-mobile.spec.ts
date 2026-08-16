import { expect, test } from '@playwright/test';

test('publishes valid installable PWA metadata', async ({ page, request }) => {
  await page.goto('/');

  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/icons/apple-touch-icon.png');
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#2563eb');

  const manifestResponse = await request.get('/manifest.webmanifest');
  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({
    name: 'Visual Steps',
    short_name: 'Visual Steps',
    start_url: '/',
    display: 'standalone',
    theme_color: '#2563eb',
  });
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ src: '/icons/icon-192.png', sizes: '192x192' }),
    expect.objectContaining({ src: '/icons/icon-512.png', sizes: '512x512' }),
  ]));

  for (const asset of ['/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png', '/sw.js']) {
    const response = await request.get(asset);
    expect(response.ok(), `${asset} should be available`).toBeTruthy();
  }
});

test('core public screens fit phone and tablet viewports', async ({ page }) => {
  for (const path of ['/', '/signup', '/forgot-password', '/about']) {
    await page.goto(path);
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth, `${path} should not scroll horizontally`).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  }
});

test('phone navigation exposes primary public destinations', async ({ page }) => {
  test.skip(!test.info().project.name.includes('iphone'), 'Phone navigation coverage');

  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.getByRole('link', { name: 'About' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Join now' })).toBeVisible();
});
