import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.test.local', override: false, quiet: true });
dotenv.config({ quiet: true });

const requiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required. Configure .env.test.local first.`);
  return value;
};

const testUrl = requiredEnv('SUPABASE_TEST_URL').replace(/\/$/, '');
const anonKey = requiredEnv('SUPABASE_TEST_ANON_KEY');
const serviceRoleKey = requiredEnv('SUPABASE_TEST_SERVICE_ROLE_KEY');
const applicationUrls = [process.env.SUPABASE_URL, process.env.VITE_SUPABASE_URL]
  .filter((value): value is string => Boolean(value))
  .map(value => value.trim().replace(/\/$/, ''));

if (process.env.SUPABASE_TEST_ALLOW_WRITES !== 'true') {
  throw new Error('Set SUPABASE_TEST_ALLOW_WRITES=true to acknowledge test fixture writes.');
}
if (applicationUrls.includes(testUrl)) {
  throw new Error('Refusing to run API tests against the configured application Supabase project.');
}

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = testUrl;
process.env.VITE_SUPABASE_URL = testUrl;
process.env.SUPABASE_KEY = anonKey;
process.env.SUPABASE_ANON_KEY = anonKey;
process.env.VITE_SUPABASE_ANON_KEY = anonKey;
process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;
process.env.JWT_SECRET = 'visual-steps-api-integration-test-only';

const admin = createClient(testUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const assertNoError = (error: { message: string } | null, context: string) => {
  assert.equal(error, null, `${context}: ${error?.message ?? 'unknown Supabase error'}`);
};

const createParent = async (email: string, password: string) => {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assertNoError(createError, `create ${email}`);
  assert.ok(created.user?.id);

  const userId = created.user.id;
  const { error: profileError } = await admin.from('users').upsert({
    id: userId,
    email,
    name: 'API Test Parent',
    max_parent_message_days: 20,
  });
  assertNoError(profileError, `create profile ${email}`);

  const client = createClient(testUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: signedIn, error: signInError } = await client.auth.signInWithPassword({ email, password });
  assertNoError(signInError, `sign in ${email}`);
  assert.ok(signedIn.session?.access_token);
  return { userId, token: signedIn.session.access_token };
};

const deleteUser = async (userId: string | undefined) => {
  if (!userId) return;
  await admin.from('users').delete().eq('id', userId);
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error && !error.message.toLowerCase().includes('not found')) throw error;
};

test('Visual Steps authenticated API integration', async t => {
  const runId = randomUUID();
  const password = `Vs-${randomUUID()}-Aa1!`;
  let ownerId: string | undefined;
  let strangerId: string | undefined;
  let kidId: string | undefined;
  let server: import('node:http').Server | undefined;

  try {
    const [owner, stranger] = await Promise.all([
      createParent(`vs-api-owner-${runId}@example.com`, password),
      createParent(`vs-api-stranger-${runId}@example.com`, password),
    ]);
    ownerId = owner.userId;
    strangerId = stranger.userId;

    const { default: app } = await import('../../server');
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve, reject) => {
      server!.once('listening', resolve);
      server!.once('error', reject);
    });
    const { port } = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;

    const api = async (
      path: string,
      options: { method?: string; token?: string; body?: unknown } = {},
    ) => {
      const response = await fetch(`${baseUrl}${path}`, {
        method: options.method ?? 'GET',
        headers: {
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
          ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
      const body = await response.json();
      return { response, body };
    };

    await t.test('public diagnostic endpoints are not exposed', async () => {
      const { response, body } = await api('/api/ping');
      assert.equal(response.status, 404);
      assert.equal(body.error, 'API route not found');
    });

    await t.test('protected endpoint rejects missing and invalid tokens', async () => {
      const missing = await api('/api/kids');
      assert.equal(missing.response.status, 401);

      const invalid = await api('/api/kids', { token: 'invalid-token' });
      assert.equal(invalid.response.status, 401);
    });

    await t.test('child validation, creation, retrieval, and update work through the API', async () => {
      const invalid = await api('/api/kids', { method: 'POST', token: owner.token, body: {} });
      assert.equal(invalid.response.status, 400);

      const created = await api('/api/kids', {
        method: 'POST',
        token: owner.token,
        body: {
          name: `API Kid ${runId}`,
          reward_type: 'Star',
          reward_quantity: 1,
          timezone: 'America/New_York',
        },
      });
      assert.equal(created.response.status, 201, JSON.stringify(created.body));
      assert.ok(created.body.kid?.id);
      kidId = created.body.kid.id;

      const listed = await api('/api/kids', { token: owner.token });
      assert.equal(listed.response.status, 200, JSON.stringify(listed.body));
      assert.ok(listed.body.kids.some((kid: { id: string }) => kid.id === kidId));

      const updated = await api(`/api/kids/${kidId}`, {
        method: 'PUT',
        token: owner.token,
        body: { name: `Updated API Kid ${runId}`, reward_balance: 5 },
      });
      assert.equal(updated.response.status, 200, JSON.stringify(updated.body));
    });

    await t.test('another parent cannot retrieve or update the child', async () => {
      const read = await api(`/api/kids/${kidId}`, { token: stranger.token });
      assert.ok([403, 404].includes(read.response.status), JSON.stringify(read.body));

      const update = await api(`/api/kids/${kidId}`, {
        method: 'PUT',
        token: stranger.token,
        body: { name: 'Unauthorized API update' },
      });
      assert.equal(update.response.status, 403, JSON.stringify(update.body));
    });

    await t.test('activity creation and retrieval work through the API', async () => {
      const created = await api('/api/activities', {
        method: 'POST',
        token: owner.token,
        body: {
          kidId,
          activityType: 'Routine',
          category: 'Home',
          description: 'API integration activity',
          status: 'pending',
          dueDate: '2026-08-15',
          steps: [{ description: 'API integration step' }],
        },
      });
      assert.equal(created.response.status, 201, JSON.stringify(created.body));

      const listed = await api(`/api/kids/${kidId}/activities`, { token: owner.token });
      assert.equal(listed.response.status, 200, JSON.stringify(listed.body));
      assert.ok(Array.isArray(listed.body.activities));
    });

    await t.test('parent messages can be created and retrieved through the API', async () => {
      const created = await api(`/api/kids/${kidId}/messages`, {
        method: 'POST',
        token: owner.token,
        body: { message: 'API integration message' },
      });
      assert.equal(created.response.status, 201, JSON.stringify(created.body));

      const listed = await api(`/api/kids/${kidId}/messages`, { token: owner.token });
      assert.equal(listed.response.status, 200, JSON.stringify(listed.body));
      assert.equal(listed.body.messages[0]?.message, 'API integration message');
    });

    await t.test('reward items support owner CRUD and reject another parent', async () => {
      const unauthorized = await api(`/api/kids/${kidId}/reward-items`, {
        method: 'POST',
        token: stranger.token,
        body: { name: 'Unauthorized reward', cost: 1 },
      });
      assert.equal(unauthorized.response.status, 403, JSON.stringify(unauthorized.body));

      const created = await api(`/api/kids/${kidId}/reward-items`, {
        method: 'POST',
        token: owner.token,
        body: { name: 'API reward item', cost: 2, location: 'Test', is_active: true },
      });
      assert.equal(created.response.status, 201, JSON.stringify(created.body));
      assert.ok(created.body.id);

      const listed = await api(`/api/kids/${kidId}/reward-items?onlyActive=true`, { token: owner.token });
      assert.equal(listed.response.status, 200, JSON.stringify(listed.body));
      assert.ok(listed.body.items.some((item: { id: string }) => item.id === created.body.id));

      const updated = await api(`/api/reward-items/${created.body.id}`, {
        method: 'PUT',
        token: owner.token,
        body: { name: 'Updated API reward item', cost: 2, location: 'Test', is_active: true },
      });
      assert.equal(updated.response.status, 200, JSON.stringify(updated.body));

      const deleted = await api(`/api/reward-items/${created.body.id}`, {
        method: 'DELETE',
        token: owner.token,
      });
      assert.equal(deleted.response.status, 200, JSON.stringify(deleted.body));
    });

    await t.test('reward purchase deducts balance and creates purchase history', async () => {
      const unauthorized = await api(`/api/kids/${kidId}/buy`, {
        method: 'POST',
        token: stranger.token,
        body: { quantity: 2, itemName: 'Unauthorized purchase' },
      });
      assert.ok([403, 404].includes(unauthorized.response.status), JSON.stringify(unauthorized.body));

      const purchased = await api(`/api/kids/${kidId}/buy`, {
        method: 'POST',
        token: owner.token,
        body: { quantity: 2, itemName: 'API integration reward', location: 'Test' },
      });
      assert.equal(purchased.response.status, 200, JSON.stringify(purchased.body));

      const { data: kid, error: kidError } = await admin
        .from('kids')
        .select('reward_balance')
        .eq('id', kidId)
        .single();
      assertNoError(kidError, 'read balance after API purchase');
      assert.equal(kid?.reward_balance, 3);

      const history = await api(`/api/kids/${kidId}/purchases`, { token: owner.token });
      assert.equal(history.response.status, 200, JSON.stringify(history.body));
      assert.ok(history.body.purchases.some((purchase: { item_name: string }) => purchase.item_name === 'API integration reward'));
    });

    await t.test('owner can delete the child through the API', async () => {
      const deleted = await api(`/api/kids/${kidId}`, { method: 'DELETE', token: owner.token });
      assert.equal(deleted.response.status, 200, JSON.stringify(deleted.body));
      kidId = undefined;
    });
  } finally {
    if (kidId) await admin.from('kids').delete().eq('id', kidId);
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    await Promise.allSettled([deleteUser(ownerId), deleteUser(strangerId)]);
  }
});
