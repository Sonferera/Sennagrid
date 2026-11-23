import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());

const REQUIRED_DOCS = [
  'README.md',
  'CONTRIBUTING.md',
  'AGENTS.md',
  'docs/README.md',
  'docs/PRD.md',
  'docs/BLUEPRINT.md',
  'docs/CHANGELOG.md',
  'docs/HANDOFF.md',
  'docs/SUBMISSION_CHECKLIST.md',
  'docs/updates/TEMPLATE.md',
];

const UPDATE_FILENAME_RE = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const REQUIRED_UPDATE_SECTIONS = ['## Summary', '## Changes', '## Verification'];

const errors = [];

for (const relPath of REQUIRED_DOCS) {
  if (!existsSync(join(ROOT, relPath))) {
    errors.push(`Missing required documentation file: ${relPath}`);
  }
}

const updatesDir = join(ROOT, 'docs', 'updates');
if (existsSync(updatesDir)) {
  const entries = readdirSync(updatesDir).filter((name) => name.endsWith('.md'));
  for (const filename of entries) {
    if (filename === 'TEMPLATE.md') continue;

    if (!UPDATE_FILENAME_RE.test(filename)) {
      errors.push(
        `Invalid update note filename "docs/updates/${filename}". Expected YYYY-MM-DD-<kebab-case>.md`,
      );
      continue;
    }

    const content = readFileSync(join(updatesDir, filename), 'utf8');
    for (const heading of REQUIRED_UPDATE_SECTIONS) {
      if (!content.includes(heading)) {
        errors.push(`Missing required section "${heading}" in docs/updates/${filename}`);
      }
    }
  }
}

function getChangedFiles(args) {
  if (args.includes('--staged')) {
    const out = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMRD'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    return out
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const baseIdx = args.indexOf('--base');
  if (baseIdx !== -1 && args[baseIdx + 1]) {
    const baseRef = args[baseIdx + 1];
    const out = execFileSync(
      'git',
      ['diff', '--name-only', '--diff-filter=ACMRD', `${baseRef}...HEAD`],
      { cwd: ROOT, encoding: 'utf8' },
    );
    return out
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return null;
}

const cliArgs = process.argv.slice(2);
let changedFiles = null;

try {
  changedFiles = getChangedFiles(cliArgs);
} catch (err) {
  errors.push(`Failed to inspect git diff: ${err instanceof Error ? err.message : String(err)}`);
}

if (changedFiles !== null && changedFiles.length > 0) {
  const touchedCode = changedFiles.some(
    (f) => f.startsWith('packages/') || f.startsWith('apps/'),
  );
  const touchedDocs = changedFiles.some(
    (f) =>
      f === 'docs/CHANGELOG.md' ||
      (f.startsWith('docs/updates/') && f !== 'docs/updates/TEMPLATE.md'),
  );

  if (touchedCode && !touchedDocs) {
    errors.push(
      'Code changes under packages/ or apps/ require updating docs/CHANGELOG.md or adding a dated note under docs/updates/YYYY-MM-DD-<slug>.md (see docs/updates/TEMPLATE.md).',
    );
  }
}

if (errors.length > 0) {
  console.error('[check:docs] FAILED:');
  for (const msg of errors) {
    console.error(`  - ${msg}`);
  }
  process.exit(1);
}

console.log('[check:docs] PASS: documentation structure and update rules verified.');
