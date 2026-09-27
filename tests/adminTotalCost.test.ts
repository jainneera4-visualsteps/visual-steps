import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { CONFIRMED_MONTHLY_COSTS, confirmedMonthlyTotal, createTotalCostPdf } from '../src/utils/totalCostPdf';

test('admin cost PDF keeps owner-reported subscriptions separate from estimated AI use', async () => {
  assert.equal(CONFIRMED_MONTHLY_COSTS.supabase, 25);
  assert.equal(CONFIRMED_MONTHLY_COSTS.chatgptPlus, 20);
  assert.equal(confirmedMonthlyTotal, 45);
  const pdf = await createTotalCostPdf({
    days: 30,
    totals: { requests: 3, estimatedCostUsd: 1.25 },
    models: [{ name: 'gemini-test', requests: 3, estimatedCostUsd: 1.25 }],
  });
  assert.equal(pdf.type, 'application/pdf');
  assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 4).toString(), '%PDF');
});

test('Total Cost menu and page are admin-only and load the protected AI estimate', async () => {
  const [app, layout, page] = await Promise.all([
    readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/Layout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/AdminTotalCost.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(app, /path="admin\/total-cost" element={<AdminTotalCost \/>}/);
  assert.match(layout, /label: 'Total Cost', to: '\/admin\/total-cost'/);
  assert.match(page, /api\/admin\/status/);
  assert.match(page, /api\/admin\/ai-usage\?days=30/);
  assert.match(page, /createTotalCostPdf\(aiUsage\)/);
});
