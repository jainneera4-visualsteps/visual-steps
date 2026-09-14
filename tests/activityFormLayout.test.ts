import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const activityPage = readFileSync('src/pages/AssignedActivities.tsx', 'utf8');
const activityDetails = readFileSync('src/components/ActivityDetailModal.tsx', 'utf8');

test('activity form keeps options visible in compact rows', () => {
  assert.match(activityPage, /data-guest-tour="activity-options-summary"/);
  assert.match(activityPage, /<CardContent className="flex flex-col gap-2\.5 px-4 pb-3">/);
  assert.match(activityPage, /className="order-2[^\"]*" data-guest-tour="activity-options-summary"/);
  assert.match(activityPage, /Offer as/);
  assert.match(activityPage, /Parent verification/);
  assert.match(activityPage, /divide-y divide-slate-200/);
  assert.match(activityPage, /Learner Can Choose offers this as an option/);
  assert.match(activityPage, /Choose what this activity earns based on the effort and challenge/);
  assert.match(activityPage, /Required sends completed work to the parent for approval/);
  assert.doesNotMatch(activityPage, /activeActivityOption/);
});

test('advanced activity settings retain their established controls', () => {
  assert.match(activityPage, /name="requiresVerification"/);
  assert.match(activityPage, /name="rewardQtyPreset"/);
  assert.match(activityPage, /name="activityMeaning"/);
  assert.match(activityPage, /data-guest-tour="activity-schedule"/);
});

test('activity form places its save action in the top-right header', () => {
  assert.match(activityPage, /<form id="activity-details-form" onSubmit=\{handleSubmit\}/);
  assert.doesNotMatch(activityPage, /fixed inset-x-0 bottom-0/);
  assert.match(activityPage, /data-guest-tour="activity-save" type="submit"/);
  assert.match(activityPage, /isLoading=\{isSavingActivity\}/);
  assert.match(activityPage, /setIsSavingActivity\(true\)/);
  assert.match(activityPage, /setIsSavingActivity\(false\)/);
  assert.match(activityPage, /await Promise\.all\(\[\s*fetchData\(\{ silent: true, skipSamples: true \}\)/);
});

test('parent activity details are informational and non-editable', () => {
  const parentDetailUsage = activityPage.slice(activityPage.lastIndexOf('<ActivityDetailModal'));
  assert.match(parentDetailUsage, /isReadOnly=\{true\}/);
  assert.match(parentDetailUsage, /showToggleOnly=\{false\}/);
  assert.doesNotMatch(parentDetailUsage, /onToggleStatus=/);
  assert.doesNotMatch(parentDetailUsage, /onEdit=/);
  assert.match(activityDetails, /const statusLabel =/);
  assert.match(activityDetails, /\{statusLabel\}/);
  assert.doesNotMatch(activityDetails, />Activity Mode</);
  assert.match(activityDetails, /\{activity\.category \|\| 'Activity'\} - \{statusLabel\}/);
  assert.match(activityDetails, /formatAppDate\(`\$\{activity\.due_date\.slice\(0, 10\)\}T12:00:00Z`, 'UTC'\)/);
  assert.match(activityDetails, /Assigned Date: \{assignedDate\}/);
  assert.ok(activityDetails.indexOf('Assigned Date: {assignedDate}') < activityDetails.indexOf('<span>{activity.activity_type}</span>'));
  assert.match(activityDetails, /URL: \{printableActivityLink\}/);
  assert.match(activityDetails, /\.activity-print-url \{[\s\S]*?display: none/);
  assert.match(activityDetails, /@media print \{[\s\S]*?\.activity-print-url \{[\s\S]*?display: block !important/);
  assert.match(activityDetails, /\.activity-print-card \{[\s\S]*?background: transparent !important;[\s\S]*?border: 0 !important;[\s\S]*?box-shadow: none !important/);
  assert.match(activityDetails, /aria-label="Activity schedule and reward"/);
  assert.match(activityDetails, /!showToggleOnly && !isReadOnly/);
  assert.match(activityDetails, /\{activity\.activity_type\}<\/span>/);
  assert.match(activityDetails, /aria-hidden="true"> — <\/span>/);
});
