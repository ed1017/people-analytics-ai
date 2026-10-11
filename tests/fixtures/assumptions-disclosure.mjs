// Load the actual shared component for legacy VM-based React fixture tests.
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
const exports={};
const source=fs.readFileSync(new URL('../../components/assumptions-disclosure.tsx',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(js,{exports,require:createRequire(import.meta.url)});
export const AssumptionsDisclosure=exports.AssumptionsDisclosure;
