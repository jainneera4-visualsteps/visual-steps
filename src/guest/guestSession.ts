export const GUEST_PARENT_ID = '11111111-1111-4111-8111-111111111111';
export const GUEST_KID_ID = '22222222-2222-4222-8222-222222222222';
const CHANGE_EVENT = 'visual-steps-guest-session-changed';

let active = false;

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();

export const guestProfile = {
  id: GUEST_PARENT_ID,
  email: 'guest@visualsteps.demo',
  name: 'Guest Parent',
  max_parent_message_days: 20,
  max_parent_messages: 20,
  onboarding_completed: true,
};

const kid = {
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

let activities: Array<Record<string, any>> = [
  { id: '31111111-1111-4111-8111-111111111111', kid_id: GUEST_KID_ID, activity_type: 'Morning routine', category: 'Daily Living', repeat_frequency: 'Daily', time_of_day: 'Morning', description: 'Brush teeth, get dressed, and pack the backpack.', link: '', image_url: '/illustrations/activities/morning-routine.webp', status: 'pending', requires_verification: true, due_date: today(), reward_qty: 2, steps: [{ id: 1, step_number: 1, description: 'Brush teeth', image_url: '/illustrations/activities/morning-routine.webp' }, { id: 2, step_number: 2, description: 'Get dressed', image_url: '/illustrations/activities/morning-routine.webp' }, { id: 3, step_number: 3, description: 'Pack backpack', image_url: '/illustrations/activities/morning-routine.webp' }] },
  { id: '32222222-2222-4222-8222-222222222222', kid_id: GUEST_KID_ID, activity_type: 'Read for 15 minutes', category: 'Learning', repeat_frequency: 'None', time_of_day: 'Afternoon', description: 'Choose a favorite book and find a cozy spot.', link: '', image_url: '/illustrations/activities/reading-time.webp', status: 'pending', requires_verification: false, due_date: today(), reward_qty: 1, steps: [{ id: 4, step_number: 1, description: 'Choose a book that looks interesting', image_url: '/illustrations/activities/reading-time.webp' }, { id: 5, step_number: 2, description: 'Set a 15-minute timer', image_url: '/illustrations/activities/reading-time.webp' }, { id: 6, step_number: 3, description: 'Tell someone one thing you enjoyed', image_url: '/illustrations/activities/reading-time.webp' }] },
  { id: '33333333-3333-4333-8333-333333333333', kid_id: GUEST_KID_ID, activity_type: 'Put away art supplies', category: 'Responsibility', repeat_frequency: 'None', time_of_day: 'Afternoon', description: 'Return each item to its labeled bin.', link: '', image_url: '/illustrations/activities/art-cleanup.webp', status: 'awaiting_verification', requires_verification: true, submitted_at: now(), due_date: today(), reward_qty: 2, steps: [{ id: 7, step_number: 1, description: 'Put markers and pencils in their cup', image_url: '/illustrations/activities/art-cleanup.webp' }, { id: 8, step_number: 2, description: 'Place paper in the tray', image_url: '/illustrations/activities/art-cleanup.webp' }, { id: 9, step_number: 3, description: 'Wipe the work surface', image_url: '/illustrations/activities/art-cleanup.webp' }] },
  { id: '34444444-4444-4444-8444-444444444444', kid_id: GUEST_KID_ID, activity_type: 'Math practice', category: 'Learning', repeat_frequency: 'None', time_of_day: 'Evening', description: 'Complete five fraction questions.', link: '', image_url: '/illustrations/activities/math-practice.webp', status: 'completed', requires_verification: false, completion_date: now(), due_date: today(), reward_qty: 2, steps: [{ id: 10, step_number: 1, description: 'Read each fraction question slowly', image_url: '/illustrations/activities/math-practice.webp' }, { id: 11, step_number: 2, description: 'Use a drawing if it helps', image_url: '/illustrations/activities/math-practice.webp' }, { id: 12, step_number: 3, description: 'Check each answer once', image_url: '/illustrations/activities/math-practice.webp' }] },
];
const seedActivities = structuredClone(activities);

const seedMessages = [{ id: '91111111-1111-4111-8111-111111111111', kid_id: GUEST_KID_ID, user_id: GUEST_PARENT_ID, message: kid.parent_message, created_at: now() }];
let messages = structuredClone(seedMessages);

const rewardItems = [{ id: '41111111-1111-4111-8111-111111111111', kid_id: GUEST_KID_ID, name: 'Choose family game', cost: 6, location: 'Home', is_active: true, image_url: '' }];
const bonuses = [{ id: '51111111-1111-4111-8111-111111111111', kid_id: GUEST_KID_ID, behavior_reason: 'Trying again calmly', reward_amount: 2, awarded_at: now() }];
const sampleQuiz = { id: '61111111-1111-4111-8111-111111111111', user_id: GUEST_PARENT_ID, kid_id: GUEST_KID_ID, title: 'Space Explorer Sample Quiz', topic: 'The solar system', difficulty: 'Easy', grade_level: '5th', content: JSON.stringify({ questions: [{ question: 'Which planet is known as the Red Planet?', options: ['Earth', 'Mars', 'Venus', 'Jupiter'], answer: 'Mars' }] }), created_at: now(), is_sample: true };
const sampleWorksheet = { id: '71111111-1111-4111-8111-111111111111', user_id: GUEST_PARENT_ID, kid_id: GUEST_KID_ID, title: 'Calm Morning Sequence', topic: 'Daily routines', subject: 'Life Skills', grade_level: 'All levels', worksheet_type: 'Sequencing', content: 'Number the morning steps in the order that works best for you.', created_at: now(), is_sample: true };
const sampleStory = { id: '81111111-1111-4111-8111-111111111111', user_id: GUEST_PARENT_ID, kid_id: GUEST_KID_ID, title: 'Trying Something New', content: 'Sometimes a new activity feels uncertain. I can look at the first step, ask for help, and try at my own pace.', created_at: now(), updated_at: now(), is_sample: true };

export function startGuestSession() {
  activities = structuredClone(seedActivities);
  messages = structuredClone(seedMessages);
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

export async function guestApiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const raw = input instanceof Request ? input.url : input.toString();
  const url = new URL(raw, window.location.origin);
  const path = url.pathname;
  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const body = bodyOf(init);

  if (/generate|gemini|ai-assistant|generate-image/.test(path)) return json({ error: 'AI generation is unavailable in guest mode.' }, 403);
  if (path === '/api/user/profile') return json(method === 'GET' ? { user: guestProfile } : { user: { ...guestProfile, ...body } });
  if (path === '/api/kids' && method === 'GET') return json({ kids: [kid] });
  if (path === '/api/kids' && method === 'POST') return json({ kid: { ...kid, ...body } }, 201);
  if (path === `/api/kids/${GUEST_KID_ID}`) return json(method === 'DELETE' ? { success: true } : { kid: { ...kid, ...body } });
  if (path.endsWith('/messages')) {
    if (method === 'GET') return json({ messages });
    if (method === 'POST') {
      const message = { id: crypto.randomUUID(), kid_id: GUEST_KID_ID, user_id: GUEST_PARENT_ID, message: body.message, created_at: now() };
      messages = [message, ...messages];
      return json({ message }, 201);
    }
    if (method === 'DELETE') {
      const messageId = path.split('/').pop();
      messages = messages.filter((message) => message.id !== messageId);
      return json({ success: true });
    }
  }
  if (path.startsWith('/api/activities/') && method === 'PUT') {
    const id = path.split('/').pop();
    activities = activities.map((item) => item.id === id ? { ...item, ...body, status: body.status || item.status, completion_date: body.status === 'completed' ? now() : body.status === 'pending' ? null : item.completion_date } : item);
    return json({ activity: activities.find((item) => item.id === id) });
  }
  if (path.startsWith('/api/activities/') && method === 'DELETE') { activities = activities.filter((item) => item.id !== path.split('/').pop()); return json({ success: true }); }
  if (path.includes('/activities')) {
    if (method === 'POST') {
      const activity = { ...body, id: crypto.randomUUID(), kid_id: GUEST_KID_ID, status: body.status || 'pending', due_date: body.dueDate || body.due_date || today(), steps: body.steps || [] };
      activities = [...activities, activity];
      return json({ activity }, 201);
    }
    return json({ activities, completedTodayCount: activities.filter((item) => item.status === 'completed' && item.completion_date?.startsWith(today())).length });
  }
  if (path.includes('/activity-history')) return json({ history: activities.filter((item) => item.status === 'completed').map((item) => ({ ...item, activity_history_steps: item.steps || [] })) });
  if (path.includes('/behavior-bonuses')) return json({ awards: bonuses });
  if (path.includes('/reward-items')) return json({ items: rewardItems });
  if (path.endsWith('/buy')) return json({ success: true, balance: kid.reward_balance - Number(body.quantity || 0) });
  if (path === '/api/activity-types') return json({ types: ['Daily Routine', 'Learning', 'Exercise', 'Life Skills'] });
  if (path === '/api/activity-categories') return json({ categories: ['Daily Living', 'Learning', 'Wellbeing', 'Responsibility'] });
  if (path === '/api/activity-templates') return json({ templates: [] });
  if (path === '/api/social-stories') return json({ stories: [sampleStory] });
  if (path === '/api/quizzes') return json({ quizzes: [sampleQuiz] });
  if (path === '/api/worksheets') return json({ worksheets: [sampleWorksheet] });
  if (path.includes('/quiz-results')) return json({ results: [] });
  if (path.includes('/purchases')) return json({ purchases: [] });
  if (path.includes('/reward-purchases')) return json({ purchases: [] });
  if (path.includes('/progress') || path.includes('/summary')) return json({ activities, history: [], quizResults: [], purchases: [] });
  if (path === '/api/upload') return json({ error: 'Uploads are unavailable in guest mode.' }, 403);
  return json({ error: 'This action is not available in the temporary guest session.' }, method === 'GET' ? 200 : 403);
}
