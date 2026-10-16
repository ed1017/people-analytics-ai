import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import ts from 'typescript';
const filename='components/use-home-composer-dock.ts';
const mod=new Module(filename);let cleanup,effectDeps;
mod.require=id=>id==='react'?{useLayoutEffect:(fn,deps)=>{if(!effectDeps||deps.some((value,index)=>!Object.is(value,effectDeps[index]))){cleanup?.();cleanup=fn();effectDeps=deps}}}:{PHONE_LAYOUT_QUERY:'phone'};
mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {resizeHomeComposer,useHomeComposerDock}=mod.exports;
test('initial composer grows for a long draft, shrinks after clear, and retains conversation sizing',()=>{
 let scroll=48;const node={style:{height:'200px'},get scrollHeight(){assert.equal(this.style.height,'auto');return scroll},value:'draft'};
 resizeHomeComposer(node,true);assert.equal(node.style.height,'104px');
 scroll=180;resizeHomeComposer(node,true);assert.equal(node.style.height,'182px');
 scroll=600;resizeHomeComposer(node,true);assert.equal(node.style.height,'320px');assert.equal(node.value,'draft');
 scroll=48;resizeHomeComposer(node,true);assert.equal(node.style.height,'104px');
 resizeHomeComposer(node,false);assert.equal(node.style.height,'112px');
});
test('compact document-flow docking preserves viewport caps and restores ordinary sizing',()=>{
 const prior={window:globalThis.window,document:globalThis.document,ResizeObserver:globalThis.ResizeObserver,innerHeight:globalThis.innerHeight};
 const style=()=>({values:{},setProperty(k,v){this.values[k]=v},removeProperty(k){delete this.values[k]}});
 const root={style:style(),closest:()=>null,addEventListener(){},removeEventListener(){}};
 const anchor={closest:()=>root,getBoundingClientRect:()=>({width:400})};
 const dock={style:style()},textarea={style:style()};
 const viewport={height:900,addEventListener(){},removeEventListener(){}};
 globalThis.window={visualViewport:viewport,matchMedia:()=>({matches:false}),addEventListener(){},removeEventListener(){}};
 globalThis.document={documentElement:{classList:{remove(){}}}};
 globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.innerHeight=900;
 try {
  for(const [compact,height,min,max] of [[true,900,'104px','240px'],[true,200,'96px','96px'],[false,900,'96px','240px']]){
   effectDeps=undefined;cleanup=undefined;viewport.height=height;useHomeComposerDock(true,{current:anchor},{current:dock},{current:textarea},true,compact);
   assert.equal(textarea.style.values['min-height'],min);assert.equal(textarea.style.values['max-height'],max);
   assert.equal(root.style.values['--home-composer-height'],'0px');cleanup();
  }
  // Refs stay stable while React replaces their DOM nodes when a goal moves the composer.
  const slotRef={current:anchor},dockRef={current:dock},inputRef={current:textarea};
  effectDeps=undefined;cleanup=undefined;
  useHomeComposerDock(true,slotRef,dockRef,inputRef,true,true);
  const replacement={style:style()};inputRef.current=replacement;
  slotRef.current={...anchor};dockRef.current={style:style()};
  useHomeComposerDock(true,slotRef,dockRef,inputRef,true,false);
  assert.equal(replacement.style.values['min-height'],'96px','new DOM node receives ordinary sizing after placement changes');cleanup();
 }finally{effectDeps=undefined;cleanup=undefined;for(const [key,value] of Object.entries(prior)){if(value===undefined)delete globalThis[key];else globalThis[key]=value}}
});
