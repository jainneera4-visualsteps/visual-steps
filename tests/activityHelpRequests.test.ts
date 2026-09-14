import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const childDashboard = readFileSync('src/pages/KidsDashboard.tsx', 'utf8');
const activityModal = readFileSync('src/components/ActivityDetailModal.tsx', 'utf8');
const parentActivities = readFileSync('src/pages/AssignedActivities.tsx', 'utf8');
const parentLayout = readFileSync('src/components/Layout.tsx', 'utf8');
const profileForm = readFileSync('src/pages/AddEditKid.tsx', 'utf8');
const server = readFileSync('server.ts', 'utf8');
const migration = readFileSync('database_updates/2026-09-12_activity_help_requests.sql', 'utf8');
const stepProgressMigration = readFileSync('database_updates/2026-09-13_activity_step_progress.sql', 'utf8');
const helpCommunicationMigration = readFileSync('database_updates/2026-09-13_help_communication_method.sql', 'utf8');

test('learner dashboard uses the standard framed content area', () => {
  assert.match(childDashboard, /data-layout-row="content-spacing"/);
  assert.match(childDashboard, /app-page-scroll[^\n]+px-4 py-0/);
  assert.match(childDashboard, /aria-label="Learner dashboard footer"/);
  assert.match(activityModal, /Back to List/);
  assert.match(activityModal, /text-\[12px\] font-bold uppercase transition-colors/);
});

test('learner receives a profile-selected visual prompt for nearby help', () => {
  assert.doesNotMatch(activityModal, />I Need Help</);
  assert.match(activityModal, /helpPromptText/);
  assert.match(activityModal, /Use your help sign/);
  assert.match(activityModal, /Show your help card/);
  assert.match(childDashboard, /helpCommunicationMethod=\{kid\?\.help_communication_method/);
  assert.match(childDashboard, /helpPromptAudioUrl=\{kid\?\.help_prompt_audio_url\}/);
  assert.match(activityModal, /Play: \$\{helpPromptText\}/);
  assert.match(activityModal, />Say</);
  assert.match(profileForm, /Test recording/);
  assert.doesNotMatch(profileForm, /Recorded words:/);
  assert.match(profileForm, /SpeechRecognitionClass/);
  assert.match(profileForm, /helpTranscriptRef/);
  assert.match(profileForm, /value=\{formData\.helpPromptText\} readOnly/);
  assert.match(activityModal, /helpSignImageUrl/);
  assert.match(activityModal, /helpCardImageUrl/);
  assert.match(helpCommunicationMigration, /'spoken', 'sign', 'card'/);
  assert.match(helpCommunicationMigration, /help_prompt_audio_url/);
  assert.match(helpCommunicationMigration, /help_sign_image_url/);
  assert.match(helpCommunicationMigration, /help_card_image_url/);
  assert.match(helpCommunicationMigration, /'audio\/webm'/);
  assert.match(helpCommunicationMigration, /UPDATE storage\.buckets/);
  assert.match(server, /\/api\/upload-help-audio/);
  assert.match(server, /normalizedMimeType/);
  assert.match(activityModal, /You asked for help\. Help is coming\./);
  assert.match(activityModal, /REWARD STAYS/);
  assert.match(activityModal, /Try again/);
  assert.match(activityModal, /Take a break/);
  assert.match(childDashboard, /\/help-request/);
  const cardHeader = activityModal.slice(
    activityModal.indexOf('<CardHeader className='),
    activityModal.indexOf('<CardContent className='),
  );
  assert.match(cardHeader, /Need help\?/);
  assert.match(cardHeader, /Mark as Finished/);
});

test('visual step progress is persisted without blocking learner completion', () => {
  assert.match(activityModal, /onToggleStep/);
  assert.doesNotMatch(activityModal, /Complete Each Step/);
  assert.match(activityModal, /Mark as Finished/);
  assert.match(childDashboard, /\/api\/activity-steps\/\$\{encodeURIComponent\(String\(step\.id\)\)\}\/completion/);
  assert.match(stepProgressMigration, /ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT false/);
  assert.match(stepProgressMigration, /ADD COLUMN IF NOT EXISTS current_step_number INTEGER/);
  assert.match(stepProgressMigration, /'open', 'acknowledged', 'resolved'/);
  assert.match(stepProgressMigration, /ALTER TABLE public\.activity_history_steps/);
  assert.match(server, /is_completed: step\.is_completed === true/);
  const activityUpdateRoute = server.slice(server.indexOf("app.put('/api/activities/:id'"), server.indexOf("// Get activity history for a specific kid"));
  assert.doesNotMatch(activityUpdateRoute, /update\(\{ is_completed: true/);
  assert.match(server, /const isOwningParent = req\.user\.role !== 'kid'/);
  assert.match(parentActivities, /current_step_number/);
});

test('activity details keeps back navigation left and form actions top-right', () => {
  assert.match(activityModal, /sm:items-end sm:justify-between/);
  assert.match(activityModal, /View Activity Details/);
  assert.match(activityModal, /Back to List/);
  const headerStart = activityModal.indexOf('View Activity Details');
  const cardStart = activityModal.indexOf('<Card className=', headerStart);
  const actionHeader = activityModal.slice(headerStart, cardStart);
  assert.match(actionHeader, /Print/);
  assert.match(actionHeader, /Edit/);
  assert.doesNotMatch(actionHeader, /Back to List/);
});

test('parent receives a separate help queue with one immediate response', () => {
  assert.match(parentActivities, /Needs Help/);
  assert.match(parentActivities, /I’m coming/);
  assert.doesNotMatch(parentActivities.slice(parentActivities.indexOf('const renderHelpRequestedTab'), parentActivities.indexOf('const reviewActivity')), /Edit steps|Ready again|Put on hold/);
  assert.match(server, /help_response/);
  assert.match(childDashboard, /Parent is coming/);
  assert.match(parentLayout, /playHelpAlertTone/);
  assert.match(parentLayout, /socket\.on\('help_requested'/);
  assert.match(server, /emit\('help_requested'/);
  assert.match(activityModal, /🙋/);
  assert.match(activityModal, /🧑‍🧒/);
  assert.match(activityModal, /REWARD STAYS/);
});

test('help requests are separate from activity completion and rewards', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.activity_help_requests/);
  assert.match(migration, /WHERE status = 'open'/);
  assert.match(server, /Help can only be requested for an available activity/);
  assert.doesNotMatch(
    server.slice(server.indexOf("app.post('/api/activities/:id/help-request'"), server.indexOf("app.put('/api/activity-help-requests/:id'")),
    /increment_reward_balance|activity_history/,
  );
});
