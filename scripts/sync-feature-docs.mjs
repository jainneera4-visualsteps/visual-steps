import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const registry = JSON.parse(await readFile(new URL('feature-registry.json', root), 'utf8'));

const start = '<!-- FEATURE_REGISTRY:START -->';
const end = '<!-- FEATURE_REGISTRY:END -->';
const rows = registry.map((feature) => `| ${feature.title} | ${feature.plan} | ${feature.introducedOn} | ${feature.summary} |`).join('\n');
const generated = `${start}\n## Synchronized feature registry\n\nThis section is generated from \`feature-registry.json\`. Update the registry when a feature is added, changed, or removed; normal lint, test, development, and build commands refresh this table.\n\n| Feature | Plan | Introduced | Current description |\n| --- | --- | --- | --- |\n${rows}\n${end}`;

for (const filename of ['README.md', 'PRD.md']) {
  const url = new URL(filename, root);
  let content = await readFile(url, 'utf8');
  const expression = new RegExp(`${start}[\\s\\S]*?${end}`, 'm');
  content = expression.test(content) ? content.replace(expression, generated) : `${content.trimEnd()}\n\n${generated}\n`;
  await writeFile(url, content);
}
