import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dashboard = readFileSync('src/pages/Dashboard.tsx', 'utf8');
const activities = readFileSync('src/pages/AssignedActivities.tsx', 'utf8');
const navigationStandard = readFileSync('NAVIGATION_DESIGN_STANDARD.md', 'utf8');
const layout = readFileSync('src/components/Layout.tsx', 'utf8');
const kidsDashboard = readFileSync('src/pages/KidsDashboard.tsx', 'utf8');

test('dashboard gives communication the full content frame without local pill navigation', () => {
  assert.doesNotMatch(dashboard, /aria-label=\{`\$\{kid\.name\}'s workspace`\}/);
  assert.match(dashboard, /<section className="h-full w-full rounded-none border-0 bg-white/);
  assert.match(dashboard, /<div className="min-h-0 flex-1">\{renderContent\(\)\}<\/div>/);
  assert.match(dashboard, /Parent Message Input/);
  assert.match(dashboard, /aria-label="Choose an emoji"/);
  assert.match(dashboard, /aria-label="Message emojis"/);
  assert.doesNotMatch(dashboard, />Activities Setup<\/Button>/);
});

test('activity workspace shows contextual secondary navigation', () => {
  assert.doesNotMatch(activities, /> Back to Dashboard/);
  assert.match(activities, /<div className="w-full space-y-2 px-0">/);
  assert.match(activities, /<div className="hidden" aria-hidden="true">/);
  assert.match(activities, /app-page-title/);
  assert.match(activities, /ACTIVITY_WORKSPACE_TABS\.includes\(nextTab as ActivityWorkspaceTab\)/);
  assert.match(activities, /activeTab === 'rewards'[\s\S]*?Add New Reward Item[\s\S]*?Add Reward Item/);
  assert.doesNotMatch(activities, /Filter rewards by location[\s\S]{0,800}data-guest-tour="add-reward"/);
  assert.match(activities, /Filter rewards by location/);
  assert.match(activities, /\+ Add new location/);
  assert.match(activities, /Active Rewards/);
  assert.match(activities, /Inactive Rewards/);
  assert.match(activities, /xl:grid-cols-4/);
});

test('growth follows a documented three-level navigation standard', () => {
  assert.match(navigationStandard, /Product navigation/);
  assert.match(navigationStandard, /Workspace navigation/);
  assert.match(navigationStandard, /View controls/);
  assert.match(navigationStandard, /Parent workspaces may be information-dense; learner screens must retain larger controls/);
});

test('parent shell uses stable primary workspaces and contextual navigation', () => {
  assert.match(layout, /Main parent workspaces/);
  for (const label of ['Dashboard', 'Activities', 'Rewards', 'Learning', 'Progress', 'Connect', 'Newsletter']) {
    assert.match(layout, new RegExp(`label: '${label}'`));
  }
  assert.match(layout, /workspaceSecondaryLinks/);
  assert.match(layout, /parentWorkspaces\.map\(workspace =>/);
  assert.match(layout, /workspaceSecondaryLinks\[workspace\.id\]/);
  assert.match(layout, /max-h-\[calc\(100dvh-4rem\)\] overflow-y-auto/);
  assert.match(layout, /workspace navigation/);
  assert.match(layout, /aria-current=\{currentWorkspace === item\.id/);
  assert.match(layout, /visual-steps:selected-kid/);
  assert.match(layout, /navigate\('\/dashboard\?tour=1'\)/);
  assert.match(layout, /currentWorkspace === 'dashboard'/);
  assert.match(layout, /Climb together\. Effortless tools for certain steps and positive growth\./);
  assert.doesNotMatch(layout, /dashboard: \[[\s\S]*?label: 'Overview'[\s\S]*?\],\n    activities:/);
  for (const label of ['Current', 'Needs Attention', 'Verification', 'Completed', 'On Hold', 'Ended', 'Rewards Catalog', 'Positive Recognition', 'Give Bonus Tokens']) {
    assert.match(layout, new RegExp(`label: '${label}'`));
  }
  assert.doesNotMatch(layout, /activities: \[[\s\S]*?label: 'Rewards'[\s\S]*?\],\n    learning:/);
  assert.match(layout, /rewards: \[[\s\S]*?label: 'Rewards Catalog'[\s\S]*?label: 'Positive Recognition'[\s\S]*?label: 'Give Bonus Tokens'/);
  assert.doesNotMatch(layout, /progress: \[[\s\S]*?label: 'Rewards'[\s\S]*?\],\n    support:/);
  assert.doesNotMatch(layout, /progress: \[[\s\S]*?label: 'Completed Work'[\s\S]*?\],\n    support:/);
  assert.match(layout, /progress: \[[\s\S]*?label: 'Quizzes'[\s\S]*?label: 'Games'[\s\S]*?label: 'Retries'[\s\S]*?label: 'Rewards History'[\s\S]*?label: 'Activity History'[\s\S]*?label: 'Summary'/);
  assert.match(layout, /\?view=quiz-results/);
  assert.match(layout, /\?view=game-results/);
  assert.match(layout, /\['rewards', 'bonus_rewards', 'positive_recognition', 'bonus_tokens'\]\.includes\(requestedActivityTab/);
  assert.match(layout, /support: \[[\s\S]*?label: 'Contact'[\s\S]*?label: 'Share with the Community'/);
  assert.doesNotMatch(layout, /support: \[[\s\S]*?label: 'Plans'[\s\S]*?\],\n    admin:/);
  assert.match(layout, /to="\/pricing"[^>]*>Plans<\/Link>/);
  assert.match(layout, /newsletter: \[[\s\S]*?label: 'Weekly Archive'[\s\S]*?label: isNewsletterSubscribed \? 'Unsubscribe Newsletter' : 'Subscribe Newsletter'/);
  assert.doesNotMatch(layout, /label: 'Learner Messages'/);
  assert.match(layout, /isNewsletterAdmin \? \[\{ id: 'admin', label: 'Admin'/);
  assert.match(layout, /workspace === 'admin'\) return '\/admin\/insights'/);
  assert.match(layout, /<header className="[^"]*shrink-0/);
  assert.match(layout, /<main className="[^"]*min-h-0[^"]*overflow-y-auto/);
  assert.match(layout, /<main className="[^"]*bg-white px-4 py-0/);
  assert.match(layout, /<div className="min-h-full w-full bg-white/);
  assert.match(layout, /<footer className="[^"]*shrink-0/);
  assert.match(layout, /aria-label=\{`Selected learner: \$\{selectedHeaderKid\.name\}`\}/);
  assert.match(layout, /selectedHeaderKid\.reward_balance/);
  assert.match(layout, /data-layout-row="content-spacing"/);
  assert.match(layout, /assigned-activities\|progress-report\|summary-report\|edit-kid/);
  assert.match(layout, /<Outlet \/>/);
  assert.doesNotMatch(layout, /<Outlet key=/);
  assert.doesNotMatch(layout, /activities: \[[\s\S]*?label: 'Activity Library'[\s\S]*?\],\n    learning:/);
});

test('Not Chosen navigation appears only when the selected learner has an item', () => {
  assert.match(layout, /activityWorkspaceCounts\.notChosen > 0 \? \[\{ label: 'Not Chosen'/);
  assert.match(layout, /notChosen: activities\.filter\(activity => activity\.status === 'not_chosen'\)\.length/);
  assert.match(layout, /requestedTab === 'not_chosen' \? nextCounts\.notChosen === 0/);
});

test('learner dashboard uses a fixed simplified application frame', () => {
  assert.match(kidsDashboard, /flex h-dvh w-full flex-col overflow-hidden/);
  assert.match(kidsDashboard, /flex h-16 w-full items-center/);
  assert.match(kidsDashboard, /flex h-20 w-full shrink-0/);
  assert.match(kidsDashboard, /aria-label="Learner dashboard sections"/);
  assert.match(kidsDashboard, /\['todo', 'Choose an Activity', navigationIcons\[0\]/);
  assert.match(kidsDashboard, /parent-nav relative z-50/);
  assert.match(kidsDashboard, /<main[\s\S]*?<nav[\s\S]*?aria-label="Learner dashboard sections"/);
  assert.match(kidsDashboard, /min-h-0 w-full flex-1 overflow-y-auto/);
  assert.match(kidsDashboard, /<footer/);
});
