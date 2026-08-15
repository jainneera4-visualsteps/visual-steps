import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.test.local', override: false, quiet: true });
dotenv.config({ quiet: true });

const requiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required. Configure a disposable database in .env.test.local.`);
  }
  return value;
};

const testUrl = requiredEnv('SUPABASE_TEST_URL').replace(/\/$/, '');
const anonKey = requiredEnv('SUPABASE_TEST_ANON_KEY');
const serviceRoleKey = requiredEnv('SUPABASE_TEST_SERVICE_ROLE_KEY');
const productionUrls = [process.env.SUPABASE_URL, process.env.VITE_SUPABASE_URL]
  .filter((value): value is string => Boolean(value))
  .map(value => value.trim().replace(/\/$/, ''));

if (process.env.SUPABASE_TEST_ALLOW_WRITES !== 'true') {
  throw new Error('Set SUPABASE_TEST_ALLOW_WRITES=true to acknowledge that the test database is disposable.');
}

if (productionUrls.includes(testUrl)) {
  throw new Error('Refusing to run: SUPABASE_TEST_URL matches the configured application Supabase URL.');
}

const admin = createClient(testUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const assertNoError = (error: { message: string } | null, context: string) => {
  assert.equal(error, null, `${context}: ${error?.message ?? 'unknown Supabase error'}`);
};

const createAuthenticatedParent = async (email: string, password: string) => {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assertNoError(createError, `create auth user ${email}`);
  assert.ok(created.user?.id, `Supabase did not return an id for ${email}`);

  const userId = created.user.id;
  const { error: profileError } = await admin.from('users').upsert({
    id: userId,
    email,
    name: 'Integration Test Parent',
  });
  assertNoError(profileError, `create public.users profile for ${email}`);

  const client = createClient(testUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: session, error: signInError } = await client.auth.signInWithPassword({ email, password });
  assertNoError(signInError, `sign in ${email}`);
  assert.ok(session.session?.access_token, `Supabase did not return a session for ${email}`);

  return { userId, client };
};

const deleteTestUser = async (userId: string | undefined) => {
  if (!userId) return;
  await admin.from('users').delete().eq('id', userId);
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error && !error.message.toLowerCase().includes('not found')) throw error;
};

test('Supabase authentication, CRUD, RLS, rewards, messages, and content integration', async t => {
  const runId = randomUUID();
  const password = `Vs-${randomUUID()}-Aa1!`;
  let ownerId: string | undefined;
  let strangerId: string | undefined;
  let owner: SupabaseClient;
  let stranger: SupabaseClient;

  try {
    const ownerAccount = await createAuthenticatedParent(`vs-owner-${runId}@example.com`, password);
    ownerId = ownerAccount.userId;
    owner = ownerAccount.client;

    const strangerAccount = await createAuthenticatedParent(`vs-stranger-${runId}@example.com`, password);
    strangerId = strangerAccount.userId;
    stranger = strangerAccount.client;

    let kidId = '';

    await t.test('authenticated parent can create, read, and update a child', async () => {
      const { data: kid, error: insertError } = await owner
        .from('kids')
        .insert({ user_id: ownerId, name: `Integration Kid ${runId}`, reward_balance: 0 })
        .select('id, user_id, name, reward_balance')
        .single();
      assertNoError(insertError, 'insert child');
      assert.ok(kid);
      kidId = kid.id;
      assert.equal(kid.user_id, ownerId);

      const { data: updated, error: updateError } = await owner
        .from('kids')
        .update({ name: `Updated Integration Kid ${runId}` })
        .eq('id', kidId)
        .select('name')
        .single();
      assertNoError(updateError, 'update child');
      assert.equal(updated?.name, `Updated Integration Kid ${runId}`);
    });

    await t.test('RLS prevents another parent from reading or changing the child', async () => {
      const { data: visible, error: readError } = await stranger
        .from('kids')
        .select('id')
        .eq('id', kidId);
      assertNoError(readError, 'query child as another parent');
      assert.deepEqual(visible, []);

      const { data: changed, error: updateError } = await stranger
        .from('kids')
        .update({ name: 'Unauthorized change' })
        .eq('id', kidId)
        .select('id');
      assertNoError(updateError, 'attempt child update as another parent');
      assert.deepEqual(changed, []);
    });

    await t.test('activities and activity steps persist with ownership policies', async () => {
      const { data: activity, error: activityError } = await owner
        .from('activities')
        .insert({ kid_id: kidId, description: 'Integration activity', status: 'pending' })
        .select('id')
        .single();
      assertNoError(activityError, 'insert activity');
      assert.ok(activity?.id);

      const { error: stepError } = await owner.from('activity_steps').insert({
        activity_id: activity.id,
        step_number: 1,
        description: 'Integration step',
      });
      assertNoError(stepError, 'insert activity step');

      const { data: hidden } = await stranger.from('activities').select('id').eq('id', activity.id);
      assert.deepEqual(hidden, []);
    });

    await t.test('reward RPC increments the child balance exactly once', async () => {
      const { error: rpcError } = await owner.rpc('increment_reward_balance', {
        kid_id_param: kidId,
        amount: 3,
      });
      assertNoError(rpcError, 'increment reward balance');

      const { data: kid, error: readError } = await owner
        .from('kids')
        .select('reward_balance')
        .eq('id', kidId)
        .single();
      assertNoError(readError, 'read reward balance');
      assert.equal(kid?.reward_balance, 3);

      const { error: itemError } = await owner.from('reward_items').insert({
        kid_id: kidId,
        name: 'Integration reward',
        cost: 2,
      });
      assertNoError(itemError, 'insert reward item');

      const { error: purchaseError } = await owner.from('reward_purchases').insert({
        kid_id: kidId,
        item_name: 'Integration reward',
        cost: 2,
      });
      assertNoError(purchaseError, 'insert reward purchase');
    });

    await t.test('reward RPC rejects a different parent', async () => {
      const { error: unauthorizedError } = await stranger.rpc('increment_reward_balance', {
        kid_id_param: kidId,
        amount: 5,
      });
      assert.ok(unauthorizedError, 'another parent was able to increment this child reward balance');

      const { data: kid, error: readError } = await owner
        .from('kids')
        .select('reward_balance')
        .eq('id', kidId)
        .single();
      assertNoError(readError, 'read reward balance after unauthorized RPC');
      assert.equal(kid?.reward_balance, 3, 'unauthorized RPC changed the child reward balance');
    });

    await t.test('parent messages are isolated by parent and child', async () => {
      const { data: message, error: insertError } = await owner
        .from('parent_messages')
        .insert({ user_id: ownerId, kid_id: kidId, message: 'Integration message' })
        .select('id, message')
        .single();
      assertNoError(insertError, 'insert parent message');
      assert.equal(message?.message, 'Integration message');

      const { data: hidden, error: readError } = await stranger
        .from('parent_messages')
        .select('id')
        .eq('id', message!.id);
      assertNoError(readError, 'query parent message as another parent');
      assert.deepEqual(hidden, []);
    });

    await t.test('quiz, worksheet, and social story records persist', async () => {
      const records = [
        owner.from('quizzes').insert({ user_id: ownerId, kid_id: kidId, title: 'Integration quiz', content: '{}' }),
        owner.from('worksheets').insert({ user_id: ownerId, kid_id: kidId, title: 'Integration worksheet', content: '{}' }),
        owner.from('social_stories').insert({ user_id: ownerId, kid_id: kidId, title: 'Integration story', content: '{}' }),
      ];

      const results = await Promise.all(records);
      results.forEach((result, index) => assertNoError(result.error, `insert generated content record ${index + 1}`));
    });

    await t.test('owner can delete the child and dependent fixtures cascade', async () => {
      const { error: deleteError } = await owner.from('kids').delete().eq('id', kidId);
      assertNoError(deleteError, 'delete child');

      const { data: deleted, error: readError } = await owner.from('kids').select('id').eq('id', kidId);
      assertNoError(readError, 'verify child deletion');
      assert.deepEqual(deleted, []);
    });
  } finally {
    await Promise.allSettled([deleteTestUser(ownerId), deleteTestUser(strangerId)]);
  }
});
