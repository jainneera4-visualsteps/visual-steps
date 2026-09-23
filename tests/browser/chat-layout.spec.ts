import { expect, test } from '@playwright/test';

test('learner conversation keeps the composer visible as messages grow', async ({ page }) => {
  await page.goto('/demo');
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole('link', { name: /Preview learner view/ }).click();

  const panel = page.getByRole('complementary', { name: 'Family messages' });
  const conversation = panel.getByRole('log', { name: 'Conversation with Parent' });
  const composer = panel.getByRole('textbox', { name: 'Write a message to Parent' });
  await expect(panel).toBeVisible();
  await expect(conversation.getByText('Parent')).toBeVisible();

  for (let index = 0; index < 10; index += 1) {
    await panel.getByRole('button', { name: 'Can we talk?' }).click();
    await expect(conversation.getByText('Can we talk?')).toHaveCount(index + 1);
  }

  const bounds = await panel.evaluate(element => {
    const panelBounds = element.getBoundingClientRect();
    const inputBounds = element.querySelector('input')!.getBoundingClientRect();
    const log = element.querySelector('[role="log"]')!;
    return {
      inputTop: inputBounds.top,
      inputBottom: inputBounds.bottom,
      panelTop: panelBounds.top,
      panelBottom: panelBounds.bottom,
      logScrolls: log.scrollHeight > log.clientHeight,
    };
  });
  expect(bounds.logScrolls).toBe(true);
  expect(bounds.inputTop).toBeGreaterThanOrEqual(bounds.panelTop);
  expect(bounds.inputBottom).toBeLessThanOrEqual(bounds.panelBottom);
  await expect(composer).toBeVisible();
});

test('Chromium desktop and Android emulation expose Web Push primitives', async ({ page, request }) => {
  await page.goto('/');
  const support = await page.evaluate(() => ({
    secure: window.isSecureContext,
    serviceWorker: 'serviceWorker' in navigator,
    pushManager: 'PushManager' in window,
    notification: 'Notification' in window,
  }));
  expect(support).toEqual({ secure: true, serviceWorker: true, pushManager: true, notification: true });
  expect((await request.get('/sw.js')).ok()).toBe(true);
});
