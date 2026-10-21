import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
if(!fs.statSync('.next/BUILD_ID').isFile())throw Error('Completed build required');
const inventory=[];
function walk(dir,prefix){for(const name of fs.readdirSync(dir).sort()){const file=path.join(dir,name),stat=fs.lstatSync(file);if(stat.isSymbolicLink())throw Error('Unexpected asset symlink');if(stat.isDirectory())walk(file,prefix+name+'/');else if(stat.isFile()){const b=fs.readFileSync(file);inventory.push({path:prefix+name,bytes:b.length,sha256:hash(b)});}else throw Error('Unexpected asset type');}}
walk('public','/');walk('.next/static','/_next/static/');
if(!inventory.length||!inventory.some(x=>x.path.startsWith('/_next/static/')))throw Error('Empty client inventory');
for(const asset of inventory)console.log('PREVIEW_ASSET '+JSON.stringify(asset));
console.log('PREVIEW_ASSET_SUMMARY '+JSON.stringify({count:inventory.length,bytes:inventory.reduce((n,x)=>n+x.bytes,0),sha256:hash(JSON.stringify(inventory))}));
