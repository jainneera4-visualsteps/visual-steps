import assert from 'node:assert/strict';
import test from 'node:test';
import { updateAuthenticationUser } from '../server/authAdmin';

test('password reset synchronizes the Supabase Auth email and password', async () => {
  const calls: Array<{ userId: string; updates: { email?: string; password?: string } }> = [];
  const client = {
    auth: {
      admin: {
        updateUserById: async (userId: string, updates: { email?: string; password?: string }) => {
          calls.push({ userId, updates });
          return { error: null };
        },
      },
    },
  };

  const error = await updateAuthenticationUser(client, 'user-1', {
    email: 'parent@example.com',
    password: 'new-password',
  });
  assert.equal(error, null);
  assert.deepEqual(calls, [{
    userId: 'user-1',
    updates: { email: 'parent@example.com', password: 'new-password' },
  }]);
});

test('profile authentication updates can include email and password', async () => {
  let received: unknown;
  const client = {
    auth: {
      admin: {
        updateUserById: async (_userId: string, updates: unknown) => {
          received = updates;
          return { error: null };
        },
      },
    },
  };

  await updateAuthenticationUser(client, 'user-2', {
    email: 'new@example.com',
    password: 'new-password',
  });
  assert.deepEqual(received, { email: 'new@example.com', password: 'new-password' });
});

test('authentication update errors are returned to the API handler', async () => {
  const expected = { message: 'Auth update failed' };
  const client = {
    auth: {
      admin: {
        updateUserById: async () => ({ error: expected }),
      },
    },
  };

  assert.equal(await updateAuthenticationUser(client, 'user-3', { password: 'new-password' }), expected);
});
