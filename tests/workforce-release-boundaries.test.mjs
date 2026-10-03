import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
const root=fileURLToPath(new URL('../',import.meta.url));
const sourceFile=file=>ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
function runtimeSpecifiers(source){
 const names=[];
 function visit(node){
  if(ts.isImportDeclaration(node)){
   const clause=node.importClause;
   const typeOnly=clause?.isTypeOnly||clause&&!clause.name&&clause.namedBindings&&ts.isNamedImports(clause.namedBindings)&&clause.namedBindings.elements.length>0&&clause.namedBindings.elements.every(item=>item.isTypeOnly);
   if(!typeOnly&&ts.isStringLiteral(node.moduleSpecifier))names.push(node.moduleSpecifier.text);
  }
  if(ts.isExportDeclaration(node)&&!node.isTypeOnly&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier))names.push(node.moduleSpecifier.text);
  if(ts.isCallExpression(node)&&(node.expression.kind===ts.SyntaxKind.ImportKeyword||ts.isIdentifier(node.expression)&&node.expression.text==='require')&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0]))names.push(node.arguments[0].text);
  ts.forEachChild(node,visit);
 }
 visit(source);return names;
}
function resolveLocal(from,specifier){
 const base=specifier.startsWith('@/')?path.join(root,specifier.slice(2)):specifier.startsWith('.')?path.resolve(path.dirname(from),specifier):null;
 if(!base)return null;
 return [base,...['.ts','.tsx','.mjs','.js','/index.ts','/index.tsx'].map(extension=>base+extension)].find(file=>fs.existsSync(file)&&fs.statSync(file).isFile()&&/\.(tsx?|m?js)$/.test(file))??null;
}
function reachable(entries){
 const seen=new Set(),pending=[...entries];
 while(pending.length){const file=pending.pop();if(seen.has(file))continue;seen.add(file);for(const specifier of runtimeSpecifiers(sourceFile(file))){const next=resolveLocal(file,specifier);if(next)pending.push(next)}}
 return new Set([...seen].map(file=>path.relative(root,file)));
}
test('production runtime graph excludes offline search, ML, live agent adapter and development hosts',()=>{
 const entries=fs.readdirSync(path.join(root,'app'),{recursive:true}).filter(name=>/\.(tsx?|m?js)$/.test(name)).map(name=>path.join(root,'app',name));
 assert.ok(entries.length>0);const graph=reachable(entries);
 assert.ok(graph.has('components/workforce-alternatives.tsx'));
 for(const file of ['lib/workforce-mix-search.ts','lib/workforce-mix-selection.ts','lib/ml/hiring-evaluation.ts','lib/workforce-agent-openai.ts'])assert.equal(graph.has(file),false,file+' must remain internal');
 assert.ok([...graph].every(file=>!file.startsWith('tests/')),'No fixture transport is reachable from app code');
});
test('production alternatives caller does not supply a search source or verifier',()=>{
 const source=sourceFile(path.join(root,'components/workforce-solution-panel.tsx'));let calls=0;
 function visit(node){
  if((ts.isJsxSelfClosingElement(node)||ts.isJsxOpeningElement(node))&&node.tagName.getText(source)==='WorkforceAlternatives'){
   calls++;for(const attribute of node.attributes.properties){assert.equal(ts.isJsxSpreadAttribute(attribute),false,'Do not hide production handoff configuration in spread props');assert.notEqual(attribute.name?.getText(source),'selection')}
  }
  ts.forEachChild(node,visit);
 }
 visit(source);assert.equal(calls,1);
});
test('client handoff has no transport or runtime dependency on Node-only verification',()=>{
 const file=path.join(root,'components/workforce-selection-handoff.tsx'),source=sourceFile(file),graph=reachable([file]);
 assert.equal(graph.has('lib/workforce-mix-selection.ts'),false);assert.equal(graph.has('lib/workforce-mix-search.ts'),false);
 function visit(node){
  if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression))assert.notEqual(node.expression.text,'fetch','Verification remains an explicit trusted host injection');
  ts.forEachChild(node,visit);
 }
 visit(source);
});
