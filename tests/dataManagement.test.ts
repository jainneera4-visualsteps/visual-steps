import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync('src/pages/DataManagement.tsx', 'utf8');
const server = readFileSync('server.ts', 'utf8');
const migration = readFileSync('database_updates/2026-08-24_data_management.sql', 'utf8');

test('data management is parent protected and never deletes records automatically', () => {
  assert.match(server, /app\.get\('\/api\/data-management', authenticateToken/);
  assert.match(server, /app\.delete\('\/api\/data-management\/records', authenticateToken/);
  assert.match(server, /req\.user\.role === 'kid'/);
  assert.match(page, /never removes these records automatically/i);
  assert.match(page, /This cannot be undone/);
});

test('older records grid supports sorting, pagination, page selection, and bulk deletion', () => {
  assert.match(page, /type SortKey = 'title' \| 'type' \| 'learner' \| 'date'/);
  assert.match(page, /<Pagination/);
  assert.match(page, /Select all records on this page/);
  assert.match(page, /Delete selected \(\{selectedRecords\.length\}\)/);
  assert.match(page, /Array\.from\(new Set\(\[\.\.\.current, \.\.\.pageKeys\]\)\)/);
});

test('review preferences are constrained and record deletion stays family scoped', () => {
  assert.match(migration, /CHECK \(data_review_months BETWEEN 3 AND 36\)/);
  assert.match(server, /reviewMonths < 3 \|\| reviewMonths > 36/);
  assert.match(server, /\.in\('kid_id', kidIds\)/);
  assert.match(server, /Select no more than 300 records at a time/);
});
