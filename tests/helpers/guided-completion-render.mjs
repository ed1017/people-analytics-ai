import fs from 'node:fs';
import path from 'node:path';
import Module,{createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';

/** Real presentation component; no guide actions, storage or provider is mounted. */
export function renderGuidedCompletion(enabled){
 const filename=path.resolve('components/guided-demo.tsx'),require=createRequire(import.meta.url);
 const source=fs.readFileSync(filename,'utf8');
 const compiled=ts.transpileModule(source,{fileName:filename,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
 const loaded=new Module(filename);loaded.filename=filename;
 loaded.require=id=>id==='@/lib/goal-progress'?{goalProgressEnabled:enabled}:id.startsWith('@/')?{}:require(id);
 loaded._compile(compiled.outputText,filename);
 return renderToStaticMarkup(React.createElement(loaded.exports.GuidedCompletionGuidance));
}
