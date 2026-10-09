/** Test-only sparse filesystem adapter. Never imported by build.mjs. */
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {join,relative,resolve} from 'node:path';
export function withSparseSource(root,check){
 const base=process.env.DIAGNOSTIC_OFFLINE_BASE;
 if(!base)return check();
 root=resolve(root);
 const original=Object.fromEntries(['readFileSync','readdirSync','lstatSync','existsSync'].map(key=>[key,fs[key]]));
 const inventory=JSON.parse(original.readFileSync(join(root,'.home-action-acceptance/source-inventory.json')));
 const names=new Set(inventory);
 const key=path=>{if(typeof path!=='string')return null;const r=relative(root,path);return r&&!r.startsWith('..')?r:r===''?'':null;};
 const file=path=>original.existsSync(join(root,path))?join(root,path):join(base,path);
 const children=dir=>[...new Set(inventory.filter(name=>!dir||name.startsWith(dir+'/')).map(name=>name.slice(dir?dir.length+1:0).split('/')[0]))];
 try{
  fs.readFileSync=(path,...args)=>{const p=key(path);return p!==null&&names.has(p)?original.readFileSync(file(p),...args):original.readFileSync(path,...args);};
  fs.lstatSync=(path,...args)=>{const p=key(path);return p!==null&&names.has(p)?original.lstatSync(fs.realpathSync(file(p)),...args):original.lstatSync(path,...args);};
  fs.readdirSync=(path,options)=>{const p=key(path);if(p===null)return original.readdirSync(path,options);return children(p).map(name=>options?.withFileTypes?{name,isFile:()=>names.has(p?p+'/'+name:name),isDirectory:()=>!names.has(p?p+'/'+name:name)}:name);};
  fs.existsSync=path=>{const p=key(path);return p!==null?names.has(p)||inventory.some(name=>name.startsWith(p+'/')):original.existsSync(path);};
  syncBuiltinESMExports();return check();
 }finally{Object.assign(fs,original);syncBuiltinESMExports();}
}
