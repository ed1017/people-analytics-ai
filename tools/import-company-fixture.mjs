import { readFileSync, statSync } from 'node:fs';
import { importCompanyFixture } from '../lib/public-fixture/company-import.mjs';

// Explicit local file paths only; output is an unwired invented-fixture artifact.
try {
  if (process.argv.length !== 4) throw Error('usage');
  const inputs = process.argv.slice(2).map(path => {
    if (!statSync(path).isFile() || statSync(path).size > 1024 * 1024) throw Error('size');
    return readFileSync(path, 'utf8');
  });
  process.stdout.write(`${JSON.stringify(importCompanyFixture(...inputs), null, 2)}\n`);
} catch {
  // Do not print source values, paths, raw parse diagnostics or rejected payloads.
  process.stderr.write('Import rejected. Supply a valid invented aggregate config and rows; see docs/company-import-handoff.md.\n');
  process.exitCode = 1;
}
