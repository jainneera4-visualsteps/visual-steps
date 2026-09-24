export const GUEST_PARENT_ID = '11111111-1111-4111-8111-111111111111';
export const GUEST_KID_ID = '22222222-2222-4222-8222-222222222222';
const CHANGE_EVENT = 'visual-steps-guest-session-changed';

let active = false;

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();

const closeGuestUnchosenActivities = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: kid.timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const part = (type: string) => parts.find(item => item.type === type)?.value || '00';
  const localDate = `${part('year')}-${part('month')}-${part('day')}`;
  const currentMinutes = Number(part('hour')) * 60 + Number(part('minute'));
  const [endHour, endMinute] = String(kid.end_time || '24:00').split(':').map(Number);
  const pastEnd = currentMinutes >= endHour * 60 + endMinute;
  const additions: Array<Record<string, any>> = [];
  activities = activities.map(activity => {
    if (activity.status !== 'pending' || !(activity.due_date < localDate || (pastEnd && activity.due_date === localDate))) return activity;
    const reason = activity.unavailability_kind === 'cancelled' ? 'cancelled'
      : activity.unavailability_kind === 'replaced' ? 'replaced'
      : activity.unavailable_for_now ? 'temporarily_unavailable'
      : activity.due_date === localDate ? 'day_ended' : 'date_passed';
    if (activity.unavailability_kind !== 'temporary' && activity.repeat_frequency === 'Daily') {
      const nextDate = new Date(`${localDate}T12:00:00Z`);
      if (pastEnd) nextDate.setUTCDate(nextDate.getUTCDate() + 1);
      const dueDate = nextDate.toISOString().slice(0, 10);
      if (!activity.repeats_till || dueDate <= activity.repeats_till) {
        additions.push({ ...activity, id: crypto.randomUUID(), due_date: dueDate, status: 'pending',
          unavailable_for_now: false, unavailability_kind: null, unavailability_reason: null,
          replacement_activity_id: null, not_chosen_reason: null, not_chosen_at: null,
          steps: (activity.steps || []).map((step: Record<string, any>) => ({ ...step, id: nextGuestStepId++, is_completed: false, completed_at: null })) });
      }
    }
    return { ...activity, status: 'not_chosen', not_chosen_reason: reason, not_chosen_at: now() };
  });
  activities = [...activities, ...additions];
};

export const guestProfile = {
  id: GUEST_PARENT_ID,
  email: 'guest@visualsteps.demo',
  name: 'Guest Parent',
  onboarding_completed: true,
};

const seedKid = {
  id: GUEST_KID_ID,
  user_id: GUEST_PARENT_ID,
  name: 'Alex',
  dob: '2014-04-12',
  grade_level: '5th',
  hobbies: 'Drawing, music, puzzles',
  interests: 'Space, animals, rhythm',
  strengths: 'Visual learning, persistence',
  weaknesses: 'Multi-step transitions',
  sensory_issues: 'Prefers quiet instructions',
  behavioral_issues: '',
  avatar: '',
  reward_balance: 8,
  reward_type: 'Sticker',
  reward_quantity: 1,
  start_time: '00:00',
  end_time: '23:59',
  max_incomplete_limit: 20,
  bonus_history_limit: 5,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  parent_message: 'Take one step at a time. I am proud of your effort!',
  theme: 'sky',
  can_print: true,
};
let kid = structuredClone(seedKid);

let activities: Array<Record<string, any>> = [
  { id: '31111111-1111-4111-8111-111111111111', kid_id: GUEST_KID_ID, activity_type: 'Morning routine', category: 'Daily Living', repeat_frequency: 'Daily', time_of_day: 'Morning', description: 'Brush teeth, get dressed, and pack the backpack.', link: '', image_url: '/illustrations/activities/morning-routine.webp', status: 'pending', requires_verification: true, due_date: today(), reward_qty: 2, steps: [{ id: 1, step_number: 1, description: 'Brush teeth', image_url: '/illustrations/activities/morning-routine.webp' }, { id: 2, step_number: 2, description: 'Get dressed', image_url: '/illustrations/activities/morning-routine.webp' }, { id: 3, step_number: 3, description: 'Pack backpack', image_url: '/illustrations/activities/morning-routine.webp' }] },
  { id: '32222222-2222-4222-8222-222222222222', kid_id: GUEST_KID_ID, activity_type: 'Read for 15 minutes', category: 'Learning', repeat_frequency: 'None', time_of_day: 'Afternoon', description: 'Choose a favorite book and find a cozy spot.', link: '', image_url: '/illustrations/activities/reading-time.webp', status: 'pending', requires_verification: false, due_date: today(), reward_qty: 1, steps: [{ id: 4, step_number: 1, description: 'Choose a book that looks interesting', image_url: '/illustrations/activities/reading-time.webp' }, { id: 5, step_number: 2, description: 'Set a 15-minute timer', image_url: '/illustrations/activities/reading-time.webp' }, { id: 6, step_number: 3, description: 'Tell someone one thing you enjoyed', image_url: '/illustrations/activities/reading-time.webp' }] },
  { id: '33333333-3333-4333-8333-333333333333', kid_id: GUEST_KID_ID, activity_type: 'Put away art supplies', category: 'Responsibility', repeat_frequency: 'None', time_of_day: 'Afternoon', description: 'Return each item to its labeled bin.', link: '', image_url: '/illustrations/activities/art-cleanup.webp', status: 'awaiting_verification', requires_verification: true, submitted_at: now(), due_date: today(), reward_qty: 2, steps: [{ id: 7, step_number: 1, description: 'Put markers and pencils in their cup', image_url: '/illustrations/activities/art-cleanup.webp' }, { id: 8, step_number: 2, description: 'Place paper in the tray', image_url: '/illustrations/activities/art-cleanup.webp' }, { id: 9, step_number: 3, description: 'Wipe the work surface', image_url: '/illustrations/activities/art-cleanup.webp' }] },
  { id: '34444444-4444-4444-8444-444444444444', kid_id: GUEST_KID_ID, activity_type: 'Math practice', category: 'Learning', repeat_frequency: 'None', time_of_day: 'Evening', description: 'Complete five fraction questions.', link: '', image_url: '/illustrations/activities/math-practice.webp', status: 'completed', requires_verification: false, completion_date: now(), due_date: today(), reward_qty: 2, steps: [{ id: 10, step_number: 1, description: 'Read each fraction question slowly', image_url: '/illustrations/activities/math-practice.webp' }, { id: 11, step_number: 2, description: 'Use a drawing if it helps', image_url: '/illustrations/activities/math-practice.webp' }, { id: 12, step_number: 3, description: 'Check each answer once', image_url: '/illustrations/activities/math-practice.webp' }] },
];
const seedActivities = structuredClone(activities);
let nextGuestStepId = 1000;

const seedMessages = [{ id: '91111111-1111-4111-8111-111111111111', kid_id: GUEST_KID_ID, user_id: GUEST_PARENT_ID, message: kid.parent_message, sender: 'parent', audio_url: null as string | null, parent_read_at: null as string | null, created_at: now() }];
let messages = structuredClone(seedMessages);
const seedReviewItems = [
  { id: 'a1111111-1111-4111-8111-111111111111', type: 'quiz_result', title: 'Reading Comprehension Check', date: '2025-04-14T15:00:00.000Z', learner: 'Alex' },
  { id: 'a2222222-2222-4222-8222-222222222222', type: 'activity_history', title: 'Morning routine practice', date: '2025-05-08T14:30:00.000Z', learner: 'Alex' },
  { id: 'a3333333-3333-4333-8333-333333333333', type: 'reward_purchase', title: 'Choose family game', date: '2025-06-02T19:15:00.000Z', learner: 'Alex' },
];
let reviewItems = structuredClone(seedReviewItems);
let dataReviewMonths = 12;

const seedRewardItems = [{ id: '41111111-1111-4111-8111-111111111111', kid_id: GUEST_KID_ID, name: 'Choose family game', cost: 6, location: 'Home', is_active: true, image_url: '' }];
let rewardItems = structuredClone(seedRewardItems);
const seedBonuses = [{ id: '51111111-1111-4111-8111-111111111111', kid_id: GUEST_KID_ID, behavior_reason: 'Trying again calmly', reward_amount: 2, awarded_at: now(), is_legacy_recognition: true }];
let bonuses = structuredClone(seedBonuses);
const seedRecognitions = [{ id: '61111111-1111-4111-8111-111111111112', kid_id: GUEST_KID_ID, recognition_message: 'You kept trying when it felt difficult.', recognized_at: now() }];
let recognitions = structuredClone(seedRecognitions);
const sampleQuiz = { id: '61111111-1111-4111-8111-111111111111', user_id: GUEST_PARENT_ID, kid_id: GUEST_KID_ID, title: 'Space Explorer Sample Quiz', topic: 'The solar system', difficulty: 'Easy', grade_level: '5th', content: JSON.stringify({ questions: [{ question: 'Which planet is known as the Red Planet?', options: ['Earth', 'Mars', 'Venus', 'Jupiter'], answer: 'Mars' }] }), created_at: now(), is_sample: true };
const sampleWorksheet = { id: '71111111-1111-4111-8111-111111111111', user_id: GUEST_PARENT_ID, kid_id: GUEST_KID_ID, title: 'Calm Morning Sequence', topic: 'Daily routines', subject: 'Life Skills', grade_level: 'All levels', worksheet_type: 'Sequencing', content: 'Number the morning steps in the order that works best for you.', created_at: now(), is_sample: true };
const sampleStory = { id: '81111111-1111-4111-8111-111111111111', user_id: GUEST_PARENT_ID, kid_id: GUEST_KID_ID, title: 'Trying Something New', content: 'Sometimes a new activity feels uncertain. I can look at the first step, ask for help, and try at my own pace.', created_at: now(), updated_at: now(), is_sample: true };

export function startGuestSession() {
  kid = structuredClone(seedKid);
  activities = structuredClone(seedActivities);
  rewardItems = structuredClone(seedRewardItems);
  bonuses = structuredClone(seedBonuses);
  recognitions = structuredClone(seedRecognitions);
  messages = structuredClone(seedMessages);
  reviewItems = structuredClone(seedReviewItems);
  dataReviewMonths = 12;
  nextGuestStepId = 1000;
  active = true;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function endGuestSession() {
  active = false;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export const isGuestSession = () => active;
export const onGuestSessionChange = (listener: () => void) => {
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const bodyOf = (init?: RequestInit) => {
  try { return init?.body ? JSON.parse(String(init.body)) : {}; } catch { return {}; }
};

const normalizeGuestActivity = (body: Record<string, any>, current: Record<string, any> = {}) => ({
  ...current,
  ...body,
  activity_type: body.activityType ?? body.activity_type ?? current.activity_type ?? '',
  category: body.category ?? current.category ?? '',
  description: body.description ?? current.description ?? '',
  repeat_frequency: body.repeatFrequency ?? body.repeat_frequency ?? current.repeat_frequency ?? 'Never',
  repeat_interval: body.repeat_interval ?? body.repeatInterval ?? current.repeat_interval ?? null,
  repeat_unit: body.repeat_unit ?? body.repeatUnit ?? current.repeat_unit ?? null,
  repeats_till: body.repeatsTill ?? body.repeats_till ?? current.repeats_till ?? null,
  time_of_day: body.timeOfDay ?? body.time_of_day ?? current.time_of_day ?? 'Any time',
  time_guidance: body.timeGuidance ?? body.time_guidance ?? current.time_guidance ?? 'suggested',
  exact_time: body.exactTime ?? body.exact_time ?? current.exact_time ?? '',
  preparation_minutes: body.preparationMinutes ?? body.preparation_minutes ?? current.preparation_minutes ?? 0,
  after_time_passes: body.afterTimePasses ?? body.after_time_passes ?? current.after_time_passes ?? 'keep_available',
  unavailable_for_now: body.unavailable_for_now ?? current.unavailable_for_now ?? false,
  unavailability_kind: body.unavailability_kind ?? current.unavailability_kind ?? null,
  unavailability_reason: body.unavailability_reason ?? current.unavailability_reason ?? null,
  replacement_activity_id: body.replacement_activity_id ?? current.replacement_activity_id ?? null,
  image_url: body.imageUrl ?? body.image_url ?? current.image_url ?? '',
  due_date: body.dueDate ?? body.due_date ?? current.due_date ?? today(),
  requires_verification: body.requiresVerification ?? body.requires_verification ?? current.requires_verification ?? false,
  activity_meaning: body.activityMeaning ?? body.activity_meaning ?? current.activity_meaning ?? 'available_choice',
  reward_qty: Math.max(1, Number(body.rewardQty ?? body.reward_qty ?? current.reward_qty) || 1),
  steps: (body.steps ?? current.steps ?? []).map((step: Record<string, any>, index: number) => ({
    ...step,
    id: step.id ?? nextGuestStepId++,
    step_number: step.step_number ?? index + 1,
    is_completed: step.is_completed === true,
    completed_at: step.completed_at ?? null,
  })),
});

export async function guestApiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const raw = input instanceof Request ? input.url : input.toString();
  const url = new URL(raw, window.location.origin);
  const path = url.pathname;
  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const body = bodyOf(init);

  if (/generate|gemini|ai-assistant|generate-image/.test(path)) return json({ error: 'AI generation is unavailable in guest mode.' }, 403);
  if (path === '/api/user/profile') return json(method === 'GET' ? { user: guestProfile } : { user: { ...guestProfile, ...body } });
  if (path === '/api/data-management' && method === 'GET') return json({
    settings: { reviewMonths: Number(url.searchParams.get('reviewMonths')) || 12, lastReviewedAt: null, cutoff: '2025-08-24T00:00:00.000Z', fromDate: url.searchParams.get('fromDate') || '', toDate: url.searchParams.get('toDate') || '' },
    counts: { children: 1, activities: 14, activityHistory: 38, quizResults: 9, savedQuizzes: 4, worksheets: 6, socialStories: 5, rewardPurchases: 7, parentMessages: 3, behaviorBonuses: 8 },
    reviewItems,
  });
  if (path === '/api/data-management/settings' && method === 'PUT') {
    dataReviewMonths = Number(body.reviewMonths) || 12;
    return json({ success: true, reviewMonths: dataReviewMonths });
  }
  if (path === '/api/data-management/records' && method === 'DELETE') {
    const keys = new Set((body.records || []).map((record: any) => `${record.type}:${record.id}`));
    reviewItems = reviewItems.filter(item => !keys.has(`${item.type}:${item.id}`));
    return json({ success: true, deleted: keys.size });
  }
  if (path === '/api/kids' && method === 'GET') return json({ kids: [kid] });
  if (path === '/api/kids' && method === 'POST') {
    kid = { ...kid, ...body, id: GUEST_KID_ID, user_id: GUEST_PARENT_ID };
    return json({ kid }, 201);
  }
  if (path === `/api/kids/${GUEST_KID_ID}`) {
    if (method === 'DELETE') return json({ success: true });
    if (method === 'PUT' || method === 'PATCH') kid = { ...kid, ...body };
    return json({ kid });
  }
  const kidMessagesMatch = path.match(/^\/api\/kids\/([^/]+)\/messages(?:\/([^/]+))?$/);
  if (kidMessagesMatch && decodeURIComponent(kidMessagesMatch[1]) === GUEST_KID_ID) {
    if (method === 'GET') return json({ messages });
    if (method === 'POST' && !kidMessagesMatch[2]) {
      const message = { id: crypto.randomUUID(), kid_id: GUEST_KID_ID, user_id: GUEST_PARENT_ID, message: body.message, sender: 'parent', audio_url: body.audioUrl || null, parent_read_at: null, created_at: now() };
      messages = [message, ...messages];
      kid = { ...kid, parent_message: body.message };
      return json({ message }, 201);
    }
    if (method === 'DELETE' && kidMessagesMatch[2]) {
      const messageId = decodeURIComponent(kidMessagesMatch[2]);
      messages = messages.filter((message) => message.id !== messageId);
      return json({ success: true });
    }
  }
  if (path === `/api/kids/${GUEST_KID_ID}/replies` && method === 'POST') {
    const reply = { id: crypto.randomUUID(), kid_id: GUEST_KID_ID, user_id: GUEST_PARENT_ID, message: String(body.message || '').trim(), sender: 'learner', audio_url: null, parent_read_at: null, created_at: now() };
    messages = [reply, ...messages];
    return json({ reply }, 201);
  }
  if (path === `/api/kids/${GUEST_KID_ID}/replies/read` && method === 'POST') {
    messages = messages.map(message => message.sender === 'learner' ? { ...message, parent_read_at: now() } : message);
    return json({ success: true });
  }
  if (/^\/api\/activity-steps\/[^/]+\/completion$/.test(path) && method === 'PUT') {
    const stepId = decodeURIComponent(path.split('/')[3]);
    let updatedStep: Record<string, any> | null = null;
    let activityFound = false;
    activities = activities.map(activity => {
      const hasStep = (activity.steps || []).some((step: Record<string, any>) => String(step.id) === stepId);
      if (!hasStep) return activity;
      activityFound = true;
      if (activity.status !== 'pending' || activity.unavailable_for_now) return activity;
      const completedAt = body.isCompleted === true ? now() : null;
      const steps = (activity.steps || []).map((step: Record<string, any>) => {
        if (String(step.id) !== stepId) return step;
        updatedStep = { ...step, is_completed: body.isCompleted === true, completed_at: completedAt };
        return updatedStep;
      });
      return { ...activity, steps };
    });
    if (!activityFound) return json({ error: 'Activity step not found.' }, 404);
    if (!updatedStep) return json({ error: 'Only steps in an available activity can be changed.' }, 409);
    return json({ step: updatedStep });
  }
  if (/^\/api\/activities\/[^/]+\/availability$/.test(path) && method === 'PATCH') {
    const id = path.split('/')[3];
    const existing = activities.find(item => item.id === id);
    if (!existing || existing.status !== 'pending') return json({ error: 'Activity not found or not available for changes.' }, 404);
    const unavailable = body.unavailableForNow === true;
    const kind = unavailable ? String(body.kind || 'temporary') : null;
    const reason = unavailable ? String(body.reason || '').trim() : null;
    const replacementId = unavailable && kind === 'replaced' ? String(body.replacementActivityId || '') : null;
    if (unavailable && (!['temporary', 'cancelled', 'replaced'].includes(kind!) || !reason || reason.length > 180)) return json({ error: 'Choose a change and write a short reason.' }, 400);
    if (kind === 'replaced' && (existing.due_date !== today() || !activities.some(item => item.id === replacementId && item.kid_id === existing.kid_id && item.due_date > today() && item.status === 'pending' && !item.unavailable_for_now))) return json({ error: 'Choose a pending activity assigned for a future date.' }, 400);
    activities = activities.map(item => item.id === id
      ? { ...item, unavailable_for_now: unavailable, unavailability_kind: kind, unavailability_reason: reason, replacement_activity_id: replacementId }
      : kind === 'replaced' && item.id === replacementId ? { ...item, due_date: today() } : item);
    return json({ activity: activities.find(item => item.id === id) });
  }
  if (path.startsWith('/api/activities/') && method === 'PUT') {
    const id = path.split('/').pop();
    activities = activities.map((item) => item.id === id ? { ...normalizeGuestActivity(body, item), status: body.status || item.status, completion_date: body.status === 'completed' ? now() : body.status === 'pending' ? null : item.completion_date } : item);
    return json({ activity: activities.find((item) => item.id === id) });
  }
  if (path.startsWith('/api/activities/') && method === 'DELETE') { activities = activities.filter((item) => item.id !== path.split('/').pop()); return json({ success: true }); }
  if (path.includes('/activities')) {
    if (method === 'POST') {
      const activity = { ...normalizeGuestActivity(body), id: crypto.randomUUID(), kid_id: GUEST_KID_ID, status: body.status || 'pending' };
      activities = [...activities, activity];
      return json({ activity }, 201);
    }
    closeGuestUnchosenActivities();
    const visible = url.searchParams.get('mode') === 'kid' ? activities.filter(item => item.status !== 'not_chosen') : activities;
    return json({ activities: visible.map(item => ({ ...item, replacement_activity_name: activities.find(candidate => candidate.id === item.replacement_activity_id && candidate.status === 'pending' && !candidate.unavailable_for_now && candidate.due_date === item.due_date)?.activity_type || null })), completedTodayCount: activities.filter((item) => item.status === 'completed' && item.completion_date?.startsWith(today())).length });
  }
  if (path.includes('/activity-history')) return json({ history: activities.filter((item) => item.status === 'completed').map((item) => ({ ...item, activity_history_steps: item.steps || [] })) });
  if (path === `/api/kids/${GUEST_KID_ID}/behavior-bonuses`) {
    if (method === 'POST') {
      const rewardAmount = Math.max(1, Math.floor(Number(body.rewardAmount) || 1));
      const award = {
        id: crypto.randomUUID(),
        kid_id: GUEST_KID_ID,
        behavior_reason: String(body.behaviorReason || 'Positive recognition').trim(),
        reward_amount: rewardAmount,
        awarded_at: now(),
        is_legacy_recognition: false,
      };
      bonuses = [award, ...bonuses];
      kid = { ...kid, reward_balance: Number(kid.reward_balance || 0) + rewardAmount };
      return json({ award, rewardBalance: kid.reward_balance }, 201);
    }
    return json({ awards: bonuses });
  }
  if (path === `/api/kids/${GUEST_KID_ID}/positive-recognitions`) {
    if (method === 'POST') {
      const recognition = {
        id: crypto.randomUUID(),
        kid_id: GUEST_KID_ID,
        recognition_message: String(body.recognitionMessage || '').trim(),
        recognized_at: now(),
      };
      if (!recognition.recognition_message) return json({ error: 'Enter what you would like to recognize.' }, 400);
      recognitions = [recognition, ...recognitions];
      return json({ recognition }, 201);
    }
    const legacyRecognitions = bonuses.filter(award => award.is_legacy_recognition === true).map(award => ({
      id: `legacy-${award.id}`,
      kid_id: award.kid_id,
      recognition_message: award.behavior_reason,
      recognized_at: award.awarded_at,
    }));
    return json({ recognitions: [...recognitions, ...legacyRecognitions].sort((a, b) => String(b.recognized_at).localeCompare(String(a.recognized_at))) });
  }
  if (path === `/api/kids/${GUEST_KID_ID}/reward-items`) {
    if (method === 'POST') {
      const item = {
        id: crypto.randomUUID(),
        kid_id: GUEST_KID_ID,
        name: String(body.name || '').trim(),
        cost: Math.max(1, Number(body.cost) || 1),
        location: body.location || '',
        is_active: body.is_active !== false,
        image_url: body.imageUrl ?? body.image_url ?? '',
      };
      rewardItems = [...rewardItems, item];
      return json({ item }, 201);
    }
    const onlyActive = url.searchParams.get('onlyActive') === 'true';
    return json({ items: onlyActive ? rewardItems.filter(item => item.is_active !== false) : rewardItems });
  }
  if (path.startsWith('/api/reward-items/')) {
    const itemId = decodeURIComponent(path.split('/').pop() || '');
    if (method === 'PUT') {
      let updatedItem: typeof rewardItems[number] | undefined;
      rewardItems = rewardItems.map(item => {
        if (item.id !== itemId) return item;
        updatedItem = {
          ...item,
          ...body,
          cost: Math.max(1, Number(body.cost ?? item.cost) || 1),
          image_url: body.imageUrl ?? body.image_url ?? item.image_url ?? '',
          is_active: body.is_active !== false,
        };
        return updatedItem;
      });
      return updatedItem ? json({ item: updatedItem }) : json({ error: 'Reward item not found.' }, 404);
    }
    if (method === 'DELETE') {
      const existed = rewardItems.some(item => item.id === itemId);
      rewardItems = rewardItems.filter(item => item.id !== itemId);
      return existed ? json({ success: true }) : json({ error: 'Reward item not found.' }, 404);
    }
  }
  if (path.endsWith('/buy')) {
    kid = { ...kid, reward_balance: Math.max(0, Number(kid.reward_balance || 0) - Number(body.quantity || 0)) };
    return json({ success: true, balance: kid.reward_balance, rewardBalance: kid.reward_balance });
  }
  if (path === '/api/activity-types') {
    const typeCategories = activities.filter(item => item.activity_type && item.category)
      .map(item => ({ name: item.activity_type, category: item.category }));
    return json({ types: [...new Set(typeCategories.map(item => item.name))].sort(), typeCategories });
  }
  if (path === '/api/activity-categories') return json({ categories: ['Daily Living', 'Learning', 'Wellbeing', 'Responsibility'] });
  if (path === '/api/activity-templates') return json({ templates: [] });
  if (path === '/api/social-stories') return json({ stories: [sampleStory] });
  if (path === '/api/quizzes') return json({ quizzes: [sampleQuiz] });
  if (path === '/api/worksheets') return json({ worksheets: [sampleWorksheet] });
  if (path.includes('/quiz-results')) return json({ results: [] });
  if (path.includes('/purchases')) return json({ purchases: [] });
  if (path.includes('/reward-purchases')) return json({ purchases: [] });
  if (path.includes('/progress') || path.includes('/summary')) return json({ kid, activities, history: [], quizResults: [], gameResults: [], purchases: [] });
  if (path === '/api/upload') return json({ error: 'Uploads are unavailable in guest mode.' }, 403);
  return json({ error: 'This action is not available in the temporary guest session.' }, method === 'GET' ? 200 : 403);
}
