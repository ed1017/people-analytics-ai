/** Isolated visual fixture, not a completed live walkthrough. No network or storage. */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import {renderGuidedCompletion} from '../helpers/guided-completion-render.mjs';
const output=await fs.mkdtemp(path.join(os.tmpdir(),'guided-completion-'));
const css=(await postcss([tailwind({base:process.cwd()})]).process(await fs.readFile('app/globals.css','utf8'),{from:path.resolve('app/globals.css')})).css;
const panels=[true,false].map(enabled=>`<section aria-label="Tracking ${enabled?'enabled':'disabled'}" class="rounded-lg border border-[#8c3957] bg-[#6b203b] p-3 text-white" style="width:min(360px,100%);overflow-wrap:anywhere"><h2 class="mb-3 font-semibold">Tracking ${enabled?'enabled':'disabled'}</h2>${renderGuidedCompletion(enabled)}</section>`).join('');
const file=path.join(output,'fixture.html');
await fs.writeFile(file,`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; connect-src 'none'; img-src data:; font-src data:"><title>Guided completion copy fixture</title><style>${css.replaceAll('</style','<\\/style')}</style></head><body style="padding:16px"><h1>Guided completion copy — isolated fixture</h1><p>Real guidance component and app styles. Both flag states shown; no live walkthrough, storage or model calls.</p><main class="mt-4 flex flex-wrap gap-4">${panels}</main></body></html>`);
console.log(JSON.stringify({file,sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),fullApplicationTest:false}));
