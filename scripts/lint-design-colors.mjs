import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const sourceExtensions = ['*.css', '*.ts', '*.tsx'];
const tokenSource = 'styles/color-system.css';
const scopedPalettePrefixes = ['components/blue-dialogue/', 'components/genetics/gallery/', 'capacitor.config.ts'];
const rawColor = /#[\da-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|lab|lch)\(\s*(?:\d|\.|-)/i;
const base = process.env.DESIGN_LINT_BASE;

const args = ['diff', '--unified=0'];
if (base) args.push(`${base}...HEAD`);
else args.push('HEAD');
args.push('--', ...sourceExtensions);

let diff = '';
try {
  diff = execFileSync('git', args, { encoding: 'utf8' });
} catch (error) {
  if (error?.status === 1 && typeof error.stdout === 'string') diff = error.stdout;
  else throw error;
}

let file = '';
let line = 0;
const failures = [];

for (const entry of diff.split('\n')) {
  if (entry.startsWith('+++ b/')) {
    file = entry.slice(6);
    continue;
  }
  if (entry.startsWith('@@')) {
    const match = entry.match(/\+(\d+)/);
    line = match ? Number(match[1]) : 0;
    continue;
  }
  if (!entry.startsWith('+') || entry.startsWith('+++')) continue;
  if (file === tokenSource || scopedPalettePrefixes.some((prefix) => file.startsWith(prefix))) {
    line += 1;
    continue;
  }
  const added = entry.slice(1);
  if (rawColor.test(added)) failures.push(`${file}:${line}: ${added.trim()}`);
  line += 1;
}

const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' })
  .split('\n')
  .filter((path) => /\.(?:css|ts|tsx)$/.test(path));

for (const path of untracked) {
  if (path === tokenSource || scopedPalettePrefixes.some((prefix) => path.startsWith(prefix))) continue;
  const lines = readFileSync(path, 'utf8').split('\n');
  lines.forEach((content, index) => {
    if (rawColor.test(content)) failures.push(`${path}:${index + 1}: ${content.trim()}`);
  });
}

if (failures.length > 0) {
  console.error('New raw colors must be defined in styles/color-system.css and consumed through semantic variables.');
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log('Design color lint passed.');
