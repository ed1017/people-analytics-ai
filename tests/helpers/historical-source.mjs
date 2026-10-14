import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

// Execute an exact local Git tree, including its dependency sources and inputs.
// No fetch, dependency install, source patch, reviewed-artifact write, or hash override.
export function historicalSource(commit, script) {
  if (!/^[a-f0-9]{40}$/.test(commit)) throw Error('Full historical commit required');
  const cwd=fileURLToPath(new URL('../..',import.meta.url));
  const out=mkdtempSync(join(tmpdir(),'integrity-provenance-'));
  try {
    let archive;
    try {archive=execFileSync('git',['archive','--format=tar',commit,'lib','tests','docs','package.json'],{cwd,maxBuffer:32*1024*1024});}
    catch(cause){throw new Error(`Historical source ${commit} must be available locally; this check never fetches or substitutes current code.`,{cause});}
    execFileSync('tar',['-xf','-','-C',out],{input:archive});
    const output=execFileSync(process.execPath,['--input-type=module','-e',
      "globalThis.fetch=()=>{throw Error('Network forbidden in historical provenance check')};\n"+script],
      {cwd:out,env:{PATH:process.env.PATH,NODE_NO_WARNINGS:'1'},encoding:'utf8',maxBuffer:8*1024*1024});
    return JSON.parse(output);
  } finally {rmSync(out,{recursive:true,force:true});}
}
