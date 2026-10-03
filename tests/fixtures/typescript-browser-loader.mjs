// Use the already locked compiler for isolated browser fixtures, without adding
// a test-only product route or a new build dependency.
import ts from 'typescript';
export default function(source) {
  return ts.transpileModule(source, {fileName:this.resourcePath,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;
};
