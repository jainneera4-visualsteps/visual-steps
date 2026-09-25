import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('admin menu shows the unread Support Inbox count and refreshes after inbox actions', async () => {
  const [layout, inbox, server] = await Promise.all([
    readFile(new URL('../src/components/Layout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/SupportInbox.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../server.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(layout, /support-messages\?status=unread&page=1&pageSize=10/);
  assert.match(layout, /data\.total/);
  assert.match(layout, /item\.id === 'admin' && unreadSupportCount/);
  assert.match(layout, /workspace\.id === 'admin' && unreadSupportCount/);
  assert.match(layout, /60_000/);
  assert.match(layout, /visual-steps:support-inbox-updated/);
  assert.match(inbox, /dispatchEvent\(new Event\('visual-steps:support-inbox-updated'\)\)/);
  assert.match(server, /app\.get\('\/api\/admin\/support-messages', authenticateToken, requireAppAdmin/);
});
