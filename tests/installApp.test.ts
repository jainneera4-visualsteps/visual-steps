import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const installApp = readFileSync('src/components/InstallApp.tsx', 'utf8');
const layout = readFileSync('src/components/Layout.tsx', 'utf8');

test('website offers a browser-aware app install entry point', () => {
  assert.match(layout, /<InstallApp \/>/);
  assert.match(installApp, /beforeinstallprompt/);
  assert.match(installApp, /promptEvent\.prompt\(\)/);
  assert.match(installApp, /appinstalled/);
  assert.match(installApp, /if \(installed\) return null/);
  assert.match(installApp, /Add to Home Screen/);
  assert.match(installApp, /Add to Dock/);
});
