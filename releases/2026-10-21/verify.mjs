import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const expected=new Set(manifest.files.map(f=>f.path));
if(expected.size!==manifest.files.length)throw Error('Duplicate manifest path');
for(const f of manifest.files){
 if(path.isAbsolute(f.path)||f.path.split('/').includes('..'))throw Error('Invalid path');
 const bytes=fs.readFileSync(path.join(root,'source',f.path));
 if(bytes.length!==f.bytes||crypto.createHash('sha256').update(bytes).digest('hex')!==f.sha256)throw Error('Source mismatch: '+f.path);
}
function walk(dir,prefix=''){
 for(const item of fs.readdirSync(dir,{withFileTypes:true})){
  const name=prefix+item.name;
  if(item.isSymbolicLink())throw Error('Unexpected symlink');
  if(item.isDirectory())walk(path.join(dir,item.name),name+'/');
  else if(!expected.has(name))throw Error('Unexpected source file: '+name);
 }
}
walk(path.join(root,'source'));
console.log(`Verified ${manifest.files.length} exact deployed-source files for ${manifest.deployment}. Private runtime inputs are excluded.`);
