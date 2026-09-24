import assert from 'node:assert/strict';
import test from 'node:test';

class GuestWindow extends EventTarget {
  location = { origin: 'http://localhost:3000' };
}

Object.defineProperty(globalThis, 'window', {
  value: new GuestWindow(),
  configurable: true,
});

const guest = await import('../src/guest/guestSession.ts');

async function payload(response: Response) {
  return response.json() as Promise<any>;
}

test('guest session starts with a learner, named activities, and a temporary reset boundary', async () => {
  guest.startGuestSession();
  assert.equal(guest.isGuestSession(), true);

  const kids = await payload(await guest.guestApiFetch('/api/kids'));
  assert.equal(kids.kids.length, 1);
  assert.equal(kids.kids[0].name, 'Alex');

  const initial = await payload(await guest.guestApiFetch(`/api/kids/${guest.GUEST_KID_ID}/activities`));
  assert.ok(initial.activities.length >= 4);
  assert.ok(initial.activities.every((activity: any) => activity.activity_type.trim().length > 0));
  const suggestions = await payload(await guest.guestApiFetch('/api/activity-types'));
  assert.ok(suggestions.typeCategories.some((item: any) => item.category === 'Daily Living' && item.name === 'Morning routine'));

  await guest.guestApiFetch(`/api/kids/${guest.GUEST_KID_ID}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Temporary learner' }),
  });
  guest.startGuestSession();
  const resetKids = await payload(await guest.guestApiFetch('/api/kids'));
  assert.equal(resetKids.kids[0].name, 'Alex');
});

test('guest can add, edit, view, and delete a named activity with visual steps', async () => {
  guest.startGuestSession();
  const created = await payload(await guest.guestApiFetch(`/api/kids/${guest.GUEST_KID_ID}/activities`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      activityType: 'Get ready for school', category: 'Daily Living', description: 'Use the morning checklist.',
      rewardQty: 2, steps: [{ description: 'Get dressed' }, { description: 'Pack the bag' }],
    }),
  }));
  assert.equal(created.activity.activity_type, 'Get ready for school');
  assert.equal(created.activity.steps.length, 2);
  assert.ok(created.activity.steps.every((step: any) => step.id));

  const updated = await payload(await guest.guestApiFetch(`/api/activities/${created.activity.id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      activityType: 'Get ready for the day', description: 'Follow a short visual routine.',
      steps: created.activity.steps,
    }),
  }));
  assert.equal(updated.activity.activity_type, 'Get ready for the day');
  assert.equal(updated.activity.description, 'Follow a short visual routine.');

  const step = await payload(await guest.guestApiFetch(`/api/activity-steps/${created.activity.steps[0].id}/completion`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isCompleted: true }),
  }));
  assert.equal(step.step.is_completed, true);
  assert.ok(step.step.completed_at);

  const afterStep = await payload(await guest.guestApiFetch(`/api/kids/${guest.GUEST_KID_ID}/activities`));
  const saved = afterStep.activities.find((activity: any) => activity.id === created.activity.id);
  assert.equal(saved.steps[0].is_completed, true);

  const deleted = await guest.guestApiFetch(`/api/activities/${created.activity.id}`, { method: 'DELETE' });
  assert.equal(deleted.ok, true);
  const afterDelete = await payload(await guest.guestApiFetch(`/api/kids/${guest.GUEST_KID_ID}/activities`));
  assert.equal(afterDelete.activities.some((activity: any) => activity.id === created.activity.id), false);
});

test('guest reward changes, new locations, recognition, and purchases update immediately', async () => {
  guest.startGuestSession();
  const created = await payload(await guest.guestApiFetch(`/api/kids/${guest.GUEST_KID_ID}/reward-items`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Library visit', cost: 3, location: 'Library' }),
  }));
  assert.equal(created.item.location, 'Library');

  const listed = await payload(await guest.guestApiFetch(`/api/kids/${guest.GUEST_KID_ID}/reward-items`));
  assert.ok(listed.items.some((item: any) => item.name === 'Library visit' && item.location === 'Library'));

  const edited = await payload(await guest.guestApiFetch(`/api/reward-items/${created.item.id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Quiet library visit', location: 'Community Library', cost: 4 }),
  }));
  assert.equal(edited.item.name, 'Quiet library visit');
  assert.equal(edited.item.location, 'Community Library');

  const before = (await payload(await guest.guestApiFetch('/api/kids'))).kids[0].reward_balance;
  const bonus = await payload(await guest.guestApiFetch(`/api/kids/${guest.GUEST_KID_ID}/behavior-bonuses`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ behaviorReason: 'Asked for a break calmly', rewardAmount: 3 }),
  }));
  assert.equal(bonus.award.behavior_reason, 'Asked for a break calmly');
  assert.equal(bonus.rewardBalance, before + 3);

  const purchase = await payload(await guest.guestApiFetch(`/api/kids/${guest.GUEST_KID_ID}/buy`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quantity: 4, itemName: edited.item.name, location: edited.item.location }),
  }));
  assert.equal(purchase.rewardBalance, before - 1);
  const refreshedKid = (await payload(await guest.guestApiFetch('/api/kids'))).kids[0];
  assert.equal(refreshedKid.reward_balance, before - 1);
});

test('guest-only restrictions return clear errors instead of hanging', async () => {
  guest.startGuestSession();
  const ai = await guest.guestApiFetch('/api/generate-quiz', { method: 'POST' });
  assert.equal(ai.status, 403);
  assert.match((await payload(ai)).error, /unavailable in guest mode/i);

  const upload = await guest.guestApiFetch('/api/upload', { method: 'POST' });
  assert.equal(upload.status, 403);
  assert.match((await payload(upload)).error, /unavailable in guest mode/i);

  const unsupported = await guest.guestApiFetch('/api/support/messages', { method: 'POST' });
  assert.equal(unsupported.status, 403);
  assert.match((await payload(unsupported)).error, /not available in the temporary guest session/i);

  guest.endGuestSession();
  assert.equal(guest.isGuestSession(), false);
});
