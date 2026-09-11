import { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, RotateCcw, Sparkles, X } from 'lucide-react';
import { endGuestSession, GUEST_KID_ID, isGuestSession } from '../guest/guestSession';
import { featuresForSurface } from '../content/featureRegistry';
type GuidedStep = { route: string; target: string; title: string; body: string; prepare?: string[]; activate?: string; activeWhen?: { attribute: string; value: string } };
const activityRoute = `/assigned-activities/${GUEST_KID_ID}`;
const childRoute = `/kids-dashboard/${GUEST_KID_ID}`;
const screenNameForRoute = (route: string) => {
  if (route === '/dashboard') return 'Parent Dashboard';
  if (route === '/add-kid') return 'Child Profile';
  if (route === activityRoute) return 'Activities Setup';
  if (route === childRoute) return 'Child Dashboard';
  return 'Visual Steps';
};
const guidedSteps: GuidedStep[] = [
  { route: '/dashboard', target: '[data-guest-tour="add-child"]', title: 'Add a child or adult learner', body: 'Start here to create an individual profile. A nickname is enough, and the profile helps Visual Steps present the right schedule, supports, and rewards.' },
  { route: '/add-kid', target: '[name="name"]', title: 'Choose the profile name', body: 'Enter the name or nickname the learner should see. Families do not need to use a full legal name.' },
  { route: '/add-kid', target: '[name="dob"]', title: 'Add age-appropriate context', body: 'The date of birth helps present age-respectful guidance. Families can use an approximate date when they prefer not to record the exact date.' },
  { route: '/add-kid', target: '[name="kidCode"]', title: 'Create the learner’s access code', body: 'The learner uses this private code to open their own dashboard on another device. Choose a code they can remember, but avoid something other people could easily guess.' },
  { route: '/add-kid', target: '[name="startTime"]', title: 'Set the daily start time', body: 'The start time controls when the learner’s planned activities become available. Set it around the family’s routine rather than requiring an unnecessarily early start.' },
  { route: '/add-kid', target: '[name="endTime"]', title: 'Set the daily end time', body: 'The end time defines when the active schedule closes for the day. This helps protect time for rest, family life, and activities outside the app.' },
  { route: '/add-kid', target: '[name="maxIncompleteLimit"]', title: 'Keep the daily view manageable', body: 'Choose how many unfinished activities appear at once. A smaller number can provide a calmer, more focused learner view.' },
  { route: '/add-kid', target: '[name="rewardQuantity"]', title: 'Choose the usual activity reward', body: 'Reward Quantity sets the default number earned for successful activity completion. Parents can keep this amount small and consistent so rewards remain meaningful.' },
  { route: '/add-kid', target: '[name="bonusHistoryLimit"]', title: 'Choose how many bonuses are shown', body: 'Bonus History controls how many recent positive-behavior awards appear on the learner dashboard. Showing a short history helps the learner remember what effort or behavior was recognized.' },
  { route: '/add-kid', target: '[data-guest-tour="reward-type"]', title: 'Choose a meaningful reward symbol', body: 'Select the familiar token, sticker, point, or other symbol the family uses. The same choice appears consistently in parent and learner views.' },
  { route: '/add-kid', target: '[name="canPrint"]', title: 'Choose whether the learner can print steps', body: 'Enable this when printed activity steps would support the learner away from the screen. Parents can leave it off when printing is unnecessary or should remain parent-controlled.' },
  { route: '/add-kid', target: '[data-guest-tour="child-save"]', title: 'Save the profile', body: 'Save creates the learner workspace and child access settings. In guest mode this action is demonstrated only, and nothing is stored permanently.' },
  { route: '/dashboard', target: '[data-guest-tour="activities-setup"]', title: 'Open Activities Setup', body: 'Activities Setup opens this learner’s planning workspace. Parents can assign, schedule, review, pause, end, and revisit activities from one place.' },
  { route: activityRoute, target: '[data-guest-tour="add-activity"]', title: 'Add an activity', body: 'Use Add Activity for learning, routines, chores, exercise, hobbies, community participation, or any other meaningful goal.' },
  { route: activityRoute, target: '[data-guest-tour="activity-category"]', title: 'Choose an activity category', body: 'When you are creating an activity manually, begin by grouping it under a useful category such as Education, Chores, Exercise, Music, or Self-Care. Categories make assigned activities easier to organize and recognize.', prepare: ['[data-guest-tour="add-activity"]'] },
  { route: activityRoute, target: '[data-guest-tour="activity-name"]', title: 'Give the activity a clear name', body: 'Enter the short title the learner will see on their dashboard, such as Practice Piano or Complete Reading Exercise. A specific name makes the expected next step easier to understand.', prepare: ['[data-guest-tour="add-activity"]'] },
  { route: activityRoute, target: '[data-guest-tour="predefined-activity"]', title: 'Or use a predefined activity', body: 'Predefined activities are quizzes, worksheets, or social stories already saved in the parent’s library. Selecting a type and saved item automatically fills the related activity name, description, link, and category, which parents can review before saving.', prepare: ['[data-guest-tour="add-activity"]'] },
  { route: activityRoute, target: '[data-guest-tour="activity-description"]', title: 'Add clear instructions', body: 'Describe the purpose or expected result in concise, respectful language. Links can connect the learner directly to a website or resource.', prepare: ['[data-guest-tour="add-activity"]'] },
  { route: activityRoute, target: '[data-guest-tour="activity-steps"]', title: 'Break work into visual steps', body: 'Use short steps and optional images when the activity benefits from extra structure. Familiar activities can remain simple without unnecessary detail.', prepare: ['[data-guest-tour="add-activity"]'] },
  { route: activityRoute, target: '[data-guest-tour="activity-schedule"]', title: 'Choose when it appears', body: 'Set a due date, time of day, and repeat pattern. Recurring activities reduce repeated setup while still allowing the parent to adjust future plans.', prepare: ['[data-guest-tour="add-activity"]'] },
  { route: activityRoute, target: '[data-guest-tour="activity-reward"]', title: 'Decide whether parent verification is required', body: 'Select this when a parent needs to check whether the activity was completed before it is accepted. Leave it unselected when the activity does not require a parent review and the learner can mark it complete independently.', prepare: ['[data-guest-tour="add-activity"]'] },
  { route: activityRoute, target: '[data-guest-tour="activity-save"]', title: 'Save the activity', body: 'Save places the activity into the assigned schedule. Guest mode shows the complete form while keeping the demonstration temporary.', prepare: ['[data-guest-tour="add-activity"]'] },
  { route: activityRoute, target: '[data-guest-tour="assigned-activities"]', title: 'Review assigned activities', body: 'This grid shows what has been planned, its schedule, and its current status. Parents can open an activity to review or update its details.', prepare: ['[data-guest-tour="activity-form-close"]', '[data-guest-tour="reward-form-close"]'], activate: '[data-guest-tour="assigned-activities"]' },
  { route: activityRoute, target: '[data-guest-tour="calendar-view"]', title: 'See the schedule as a calendar', body: 'Calendar view now displays assigned work by date so recurring and upcoming plans are easier to scan. Select List whenever detailed rows are more useful.', prepare: ['[data-guest-tour="activity-form-close"]', '[data-guest-tour="reward-form-close"]', '[data-guest-tour="assigned-activities"]'], activate: '[data-guest-tour="calendar-view"]', activeWhen: { attribute: 'aria-pressed', value: 'true' } },
  { route: activityRoute, target: '[data-guest-tour="rewards-tab"]', title: 'Open Rewards', body: 'The Rewards pill opens the reward catalog and positive-behavior recognition tools. Parents remain in control of what is offered and awarded.', prepare: ['[data-guest-tour="activity-form-close"]', '[data-guest-tour="reward-form-close"]'], activate: '[data-guest-tour="rewards-tab"]' },
  { route: activityRoute, target: '[data-guest-tour="add-reward"]', title: 'Add a reward item', body: 'Create a reward the learner can work toward, choose its token cost, and decide whether it is active. Reward choices stay visible to the parent and learner.', prepare: ['[data-guest-tour="activity-form-close"]', '[data-guest-tour="reward-form-close"]', '[data-guest-tour="rewards-tab"]'] },
  { route: activityRoute, target: '[data-guest-tour="reward-item-name"]', title: 'Name the reward item', body: 'Enter the clear name the learner will see, such as Choose Tonight’s Game or 15 Minutes of Screen Time. The name should make the reward easy to understand.', prepare: ['[data-guest-tour="activity-form-close"]', '[data-guest-tour="rewards-tab"]', '[data-guest-tour="add-reward"]'] },
  { route: activityRoute, target: '[data-guest-tour="reward-item-cost"]', title: 'Set the earned-token cost', body: 'Choose how many earned tokens are needed to purchase the item. A thoughtful cost helps make the goal achievable without presenting the reward as free.', prepare: ['[data-guest-tour="activity-form-close"]', '[data-guest-tour="rewards-tab"]', '[data-guest-tour="add-reward"]'] },
  { route: activityRoute, target: '[data-guest-tour="reward-item-image"]', title: 'Add an optional reward image', body: 'Paste an image link or upload a picture when a visual reminder would help the learner recognize the reward. The image is optional, so text-only rewards work too.', prepare: ['[data-guest-tour="activity-form-close"]', '[data-guest-tour="rewards-tab"]', '[data-guest-tour="add-reward"]'] },
  { route: activityRoute, target: '[data-guest-tour="reward-item-location"]', title: 'Choose where it is available', body: 'Use Available At to show where the reward may be used, such as Home, Car, Restaurant, or Community. Parents can also add a custom location.', prepare: ['[data-guest-tour="activity-form-close"]', '[data-guest-tour="rewards-tab"]', '[data-guest-tour="add-reward"]'] },
  { route: activityRoute, target: '[data-guest-tour="reward-item-status"]', title: 'Control whether the reward is active', body: 'Active rewards appear as available choices. Turn an item inactive when it should be temporarily hidden without deleting it.', prepare: ['[data-guest-tour="activity-form-close"]', '[data-guest-tour="rewards-tab"]', '[data-guest-tour="add-reward"]'] },
  { route: activityRoute, target: '[data-guest-tour="reward-item-save"]', title: 'Save the reward item', body: 'Add Item places the reward in the catalog for this learner. Guest mode demonstrates the complete form without permanently saving the item.', prepare: ['[data-guest-tour="activity-form-close"]', '[data-guest-tour="rewards-tab"]', '[data-guest-tour="add-reward"]'] },
  { route: childRoute, target: '[data-guest-tour="child-activities"]', title: 'See activities To Be Done', body: 'This tab shows the learner’s currently available activities. The profile’s Max Activities setting keeps the visible list focused and brings forward additional assigned work as activities are completed.', prepare: ['[data-guest-tour="child-activity-close"]'], activate: '[data-guest-tour="child-activities"]' },
  { route: childRoute, target: '[data-guest-tour="child-activity-card"]', title: 'Open an activity', body: 'Select an activity card to read its description, link, pictures, and step-by-step instructions. The completion control appears inside the activity details.', prepare: ['[data-guest-tour="child-activity-close"]', '[data-guest-tour="child-activities"]'] },
  { route: childRoute, target: '[data-guest-tour="child-mark-finished"]', title: 'Mark the activity as finished', body: 'After doing the activity, the learner selects Mark as Finished. An activity requiring parent verification moves to Waiting; an activity not requiring verification is completed immediately.', prepare: ['[data-guest-tour="child-activity-card"]'] },
  { route: childRoute, target: '[data-guest-tour="child-waiting"]', title: 'Check activities that are Waiting', body: 'The Waiting tab now shows work the learner has marked finished but a parent still needs to check. Its earned tokens are added only after the parent verifies completion.', prepare: ['[data-guest-tour="child-activity-close"]'], activate: '[data-guest-tour="child-waiting"]' },
  { route: childRoute, target: '[data-guest-tour="child-completed"]', title: 'Review completed activities', body: 'The Completed tab now shows today’s accepted activities. It gives the learner a clear record of progress without allowing completed work to be submitted again.', prepare: ['[data-guest-tour="child-activity-close"]'], activate: '[data-guest-tour="child-completed"]' },
  { route: childRoute, target: '[data-guest-tour="child-rewards"]', title: 'Explore the Reward Items list', body: 'The Rewards tab now shows the active reward items, each item’s token cost, and whether the learner has earned enough. The learner asks the parent when ready to purchase an item.', prepare: ['[data-guest-tour="child-activity-close"]'], activate: '[data-guest-tour="child-rewards"]' },
  { route: childRoute, target: '[data-guest-tour="child-done-today"]', title: 'Understand Done Today', body: 'Done Today counts activities completed and accepted during the current day. It is a progress count, not the number of tokens earned.' },
  { route: childRoute, target: '[data-guest-tour="child-token-balance"]', title: 'Understand the token balance', body: 'Total Rewards shows the learner’s current spendable balance from verified or independently completed activities and parent-awarded behavior bonuses. Buying a reward item reduces this balance.' },
  { route: '/dashboard', target: '[data-guest-tour="parent-reward-balance"]', title: 'Review rewards from the parent dashboard', body: 'The parent sees the same current balance on the learner card. This keeps completed work, recognition, and purchasing decisions connected.' },
  { route: '/dashboard', target: '[data-guest-tour="parent-shop"]', title: 'Open the reward shop', body: 'The shop shows available reward items and their costs. A purchase reduces the earned balance and records the reward history.' },
  { route: '/dashboard', target: '[data-guest-tour="parent-message"]', title: 'Send a message to the learner', body: 'Parents can send a short encouragement, reminder, or emoji from the learner card. The message appears in the child view on the other device.' },
  { route: childRoute, target: '[data-guest-tour="child-message"]', title: 'See the delivered message', body: 'The learner receives the parent message prominently without opening a separate messaging app. Guest sample data demonstrates how delivery looks.' },
  { route: activityRoute, target: '[data-guest-tour="assigned-activities"]', title: 'Return to Assigned Activities', body: 'The Activities pill restores the active assigned-activities grid after the learner works through the schedule. Each status pill opens its own relevant records.', prepare: ['[data-guest-tour="activity-form-close"]', '[data-guest-tour="reward-form-close"]'], activate: '[data-guest-tour="assigned-activities"]' },
  { route: activityRoute, target: '[data-guest-tour="verification-tab"]', title: 'Open the verification grid', body: 'The Verify pill opens activities waiting for parent review. Verify & Complete confirms the result and grants the planned tokens; Reassign supports another attempt.', prepare: ['[data-guest-tour="activity-form-close"]', '[data-guest-tour="reward-form-close"]'], activate: '[data-guest-tour="verification-tab"]' },
  { route: activityRoute, target: '[data-guest-tour="completed-tab"]', title: 'Open the completed grid', body: 'The Completed pill shows activities the learner has finished and the parent has accepted. Parents can open a completed activity to decide whether it is finished, repeated, paused, or ended.', prepare: ['[data-guest-tour="activity-form-close"]', '[data-guest-tour="reward-form-close"]'], activate: '[data-guest-tour="completed-tab"]' },
  { route: activityRoute, target: '[data-guest-tour="on-hold-tab"]', title: 'Open the On Hold grid', body: 'The On Hold pill shows paused activities without deleting them. Parents can open and reassign an activity when the learner is ready to continue.', prepare: ['[data-guest-tour="activity-form-close"]', '[data-guest-tour="reward-form-close"]'], activate: '[data-guest-tour="on-hold-tab"]' },
  { route: activityRoute, target: '[data-guest-tour="ended-tab"]', title: 'Open the Discontinued / Ended grid', body: 'The Ended pill shows activities removed from the active plan while preserving their records. A parent can open one and start it again later.', prepare: ['[data-guest-tour="activity-form-close"]', '[data-guest-tour="reward-form-close"]'], activate: '[data-guest-tour="ended-tab"]' },
  { route: activityRoute, target: '[data-guest-tour="history-tab"]', title: 'Review activity history', body: 'The History pill opens the historical activity grid, including past activity and reward events. This record helps parents review patterns and plan useful next steps.', prepare: ['[data-guest-tour="activity-form-close"]', '[data-guest-tour="reward-form-close"]'], activate: '[data-guest-tour="history-tab"]' },
  { route: activityRoute, target: '[data-guest-tour="bonus-reward"]', title: 'Recognize positive behavior', body: 'The Rewards view includes a parent-controlled behavior bonus form. A parent can record focused effort, calm participation, trying again, or another specific observed behavior and award a small earned bonus.', prepare: ['[data-guest-tour="rewards-tab"]'], activate: '[data-guest-tour="rewards-tab"]' },
];

const guestFeatures = featuresForSurface('guest');
const guestFeatureUpdates = guestFeatures.filter(feature => feature.introducedOn || feature.updates?.length)
  .flatMap(feature => [
    { date: feature.introducedOn, title: feature.title, summary: feature.summary },
    ...(feature.updates || []).map(update => ({ date: update.updatedOn, title: update.title, summary: update.summary })),
  ])
  .sort((left, right) => right.date.localeCompare(left.date))
  .slice(0, 5);

const steps: GuidedStep[] = guestFeatureUpdates.length ? [
  ...guidedSteps,
  {
    route: '/dashboard',
    target: '[data-guest-tour="dashboard-menu"]',
    title: 'See what is current in Visual Steps',
    body: guestFeatureUpdates.map(update => `${update.title}: ${update.summary}`).join(' '),
  },
] : guidedSteps;

export function GuestWorkspace() {
  const location = useLocation();
  const navigate = useNavigate();
  const [active, setActive] = useState(isGuestSession());
  const [open, setOpen] = useState(isGuestSession());
  const [index, setIndex] = useState(0);
  const [calloutStyle, setCalloutStyle] = useState<CSSProperties>({ visibility: 'hidden' });
  const [placement, setPlacement] = useState<'top' | 'right' | 'bottom' | 'left'>('bottom');
  const calloutRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const wasActiveRef = useRef(active);
  const step = steps[index];

  const positionCallout = useCallback(() => {
    const target = targetRef.current;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const panelWidth = Math.min(460, window.innerWidth - 24);
    const panelHeight = calloutRef.current?.offsetHeight || 230;
    const gap = 16;
    const viewportPadding = 12;
    let nextPlacement: typeof placement = 'bottom';
    let left = rect.left + rect.width / 2 - panelWidth / 2;
    let top = rect.bottom + gap;

    if (rect.bottom + gap + panelHeight <= window.innerHeight - viewportPadding) {
      nextPlacement = 'bottom';
      top = rect.bottom + gap;
    } else if (rect.top - gap - panelHeight >= viewportPadding) {
      nextPlacement = 'top';
      top = rect.top - gap - panelHeight;
    } else if (rect.right + gap + panelWidth <= window.innerWidth - viewportPadding) {
      nextPlacement = 'right';
      left = rect.right + gap;
      top = rect.top + rect.height / 2 - panelHeight / 2;
    } else {
      nextPlacement = 'left';
      left = rect.left - gap - panelWidth;
      top = rect.top + rect.height / 2 - panelHeight / 2;
    }

    const finalLeft = Math.max(viewportPadding, Math.min(left, window.innerWidth - panelWidth - viewportPadding));
    const finalTop = Math.max(viewportPadding, Math.min(top, window.innerHeight - panelHeight - viewportPadding));
    const arrowX = Math.max(28, Math.min(rect.left + rect.width / 2 - finalLeft, panelWidth - 28));
    const arrowY = Math.max(28, Math.min(rect.top + rect.height / 2 - finalTop, panelHeight - 28));
    setPlacement(nextPlacement);
    setCalloutStyle({
      left: finalLeft,
      top: finalTop,
      width: panelWidth,
      visibility: 'visible',
      '--guest-tour-arrow-x': `${arrowX}px`,
      '--guest-tour-arrow-y': `${arrowY}px`,
    } as CSSProperties);
  }, []);

  useEffect(() => {
    const sync = () => {
      const nextActive = isGuestSession();
      if (nextActive && !wasActiveRef.current) {
        setIndex(0);
        setOpen(true);
      }
      wasActiveRef.current = nextActive;
      setActive(nextActive);
    };
    window.addEventListener('visual-steps-guest-session-changed', sync);
    return () => window.removeEventListener('visual-steps-guest-session-changed', sync);
  }, []);
  useEffect(() => {
    if (active && open && location.pathname !== step.route) navigate(step.route);
  }, [active, open, index]);
  useEffect(() => {
    if (!active || !open || location.pathname !== step.route) return;
    setCalloutStyle({ visibility: 'hidden' });
    let attempts = 0;
    let activated = false;
    let settleTimer = 0;
    const findTarget = () => {
      attempts += 1;
      const element = document.querySelector<HTMLElement>(step.target);
      if (!element) {
        if (attempts >= 2) step.prepare?.forEach(selector => document.querySelector<HTMLElement>(selector)?.click());
        if (attempts >= 40) window.clearInterval(targetTimer);
        return;
      }
      if (step.activate && !activated) {
        const activator = document.querySelector<HTMLElement>(step.activate);
        if (activator) {
          activated = true;
          activator.click();
          return;
        }
      }
      if (step.activate && step.activeWhen) {
        const activator = document.querySelector<HTMLElement>(step.activate);
        if (activator && activator.getAttribute(step.activeWhen.attribute) !== step.activeWhen.value) {
          activator.click();
          return;
        }
      }
      window.clearInterval(targetTimer);
      targetRef.current = element;
      element.classList.add('guest-tour-target', 'ring-4', 'ring-blue-400', 'ring-offset-4');
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      settleTimer = window.setTimeout(positionCallout, 300);
    };
    const targetTimer = window.setInterval(findTarget, 150);
    findTarget();
    const reposition = () => window.requestAnimationFrame(positionCallout);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.clearInterval(targetTimer);
      window.clearTimeout(settleTimer);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      targetRef.current?.classList.remove('guest-tour-target', 'ring-4', 'ring-blue-400', 'ring-offset-4');
      targetRef.current = null;
    };
  }, [active, open, location.pathname, index, positionCallout]);
  if (!active || location.pathname === '/watch') return null;
  const leave = () => { endGuestSession(); navigate('/'); };
  return <>
    <div className="fixed left-3 top-[4.25rem] z-[90] flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950 shadow-lg"><Sparkles className="h-4 w-4 text-amber-600" /> Guest · Nothing saved <button onClick={leave} className="ml-1 underline">Exit</button></div>
    {!open ? <button onClick={() => { setIndex(0); setOpen(true); }} className="fixed bottom-20 left-3 z-[90] inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-xl"><RotateCcw className="h-4 w-4" /> Replay guest tour</button> :
      <div ref={calloutRef} className={`guest-tour-callout guest-tour-callout--${placement} fixed z-[110] border-blue-500 p-5`} style={calloutStyle} role="dialog" aria-label={`Guest tour: ${step.title}`}>
        <span className="guest-tour-callout__arrow" aria-hidden="true" />
        <div className="-mx-2 -mt-2 rounded-xl px-2 pt-2">
          <button onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-full p-1 text-slate-500 hover:bg-slate-100" aria-label="Close hints"><X className="h-5 w-5" /></button>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Guest tour · {index + 1} of {steps.length}</p><h2 className="mt-2 pr-8 text-xl font-black text-slate-950">{step.title}</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
        <label className="mt-3 block text-xs font-bold text-slate-600">
          Jump to a callout
          <select
            className="mt-1 h-9 w-full rounded-lg border border-blue-200 bg-white px-2 text-sm font-semibold text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={index}
            onChange={(event) => setIndex(Number(event.target.value))}
            aria-label="Jump to a guest tour callout"
          >
            {steps.map((tourStep, stepIndex) => <option key={`${tourStep.route}-${tourStep.title}`} value={stepIndex}>{screenNameForRoute(tourStep.route)} — {tourStep.title}</option>)}
          </select>
        </label>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700"><Eye className="h-4 w-4" /> Highlighted on this screen</span><div className="flex gap-2">{index > 0 && <button onClick={() => setIndex(v => v - 1)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700">Back</button>}<button onClick={() => index === steps.length - 1 ? setOpen(false) : setIndex(v => v + 1)} className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">{index === steps.length - 1 ? 'Finish tour' : 'Next'} <ArrowRight className="h-4 w-4" /></button></div></div>
      </div>}
  </>;
}
