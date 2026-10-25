// Load actual presentation components for offline React rendering tests.
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
export function componentModule(relative,aliases={}){
 const file=new URL('../../components/'+relative,import.meta.url),require=createRequire(file),exports={};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,require:id=>aliases[id]??(id.endsWith('.module.css')?{default:{}}:require(id))});
 return exports;
}
