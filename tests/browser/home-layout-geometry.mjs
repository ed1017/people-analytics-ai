// Shared real-browser viewport evidence; no source/model traffic is created here.
import assert from 'node:assert/strict';
export function homeLayoutGeometry(){
 const port=document.querySelector('[aria-label="Home chat workspace"]'),dock=document.querySelector('.home-composer-dock'),root=document.querySelector('.home-workspace'),header=document.querySelector('main > header');
 const rect=node=>node?Object.fromEntries(['top','bottom','left','right','width','height'].map(k=>[k,node.getBoundingClientRect()[k]])):null;
 return {width:innerWidth,height:innerHeight,outer:scrollY,port:{...rect(port),scrollTop:port.scrollTop,scrollHeight:port.scrollHeight,overflow:getComputedStyle(port).overflowY,maxHeight:getComputedStyle(port).maxHeight},dock:{...rect(dock),position:getComputedStyle(dock).position},header:rect(header),guide:rect(document.querySelector('[aria-label="Optional guided demo"]')),arrow:rect(document.querySelector('[data-guided-arrow]')),variables:Object.fromEntries(['--home-visible-height','--app-header-height','--home-composer-height'].map(k=>[k,getComputedStyle(root).getPropertyValue(k)]))};
}
export async function reviewHomeLayout(page,label){
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const geometry=await page.evaluate(homeLayoutGeometry),desktop=geometry.dock.position==='fixed';
 console.log('LAYOUT '+JSON.stringify({label,...geometry}));
 if(desktop){
  assert.ok(geometry.port.bottom<=geometry.dock.top-8,label+' conversation ends above composer');
  if(geometry.port.top>=0&&geometry.port.scrollHeight>geometry.port.height+1)assert.ok(geometry.dock.top-geometry.port.bottom<=16,label+' uses available reading space');
  if(label.startsWith('edit-submit'))assert.ok(Math.min(geometry.port.bottom,geometry.dock.top)-Math.max(geometry.port.top,geometry.header.bottom)>=320,label+' guide leaves useful reading space');
 }else{
  assert.equal(geometry.port.overflow,'visible',label+' phone uses document scrolling');
  if(geometry.arrow)assert.ok(geometry.arrow.left>=12&&geometry.arrow.right<=geometry.width-12,label+' arrow keeps safe edge gutters');
 }
 if(process.env.HOME_LAYOUT_REVIEW)await page.screenshot({path:process.env.HOME_LAYOUT_REVIEW+'/'+label+'.png'});
 const draft=await page.getByLabel('Ask Workforce AI',{exact:true}).inputValue();
 // Wheel the actual reading surface, then check a resize cannot pull the reader back.
 const top=Math.max(0,geometry.port.top,desktop?geometry.header.bottom:0),bottom=Math.min(geometry.height,geometry.port.bottom,desktop?geometry.dock.top:geometry.height);
 await page.mouse.move(geometry.port.left+geometry.port.width/2,Math.max(8,(top+bottom)/2));
 await page.mouse.wheel(0,desktop&&geometry.port.scrollTop>100?-180:180);
 await page.waitForFunction(({desktop,outer,inner})=>desktop?Math.abs(document.querySelector('[aria-label="Home chat workspace"]').scrollTop-inner)>2:Math.abs(scrollY-outer)>2,{desktop,outer:geometry.outer,inner:geometry.port.scrollTop});
 const parked=await page.evaluate(()=>({outer:scrollY,inner:document.querySelector('[aria-label="Home chat workspace"]').scrollTop}));
 await page.evaluate(()=>{dispatchEvent(new Event('resize'));return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
 const after=await page.evaluate(()=>({outer:scrollY,inner:document.querySelector('[aria-label="Home chat workspace"]').scrollTop}));
 assert.ok(Math.abs(parked.outer-after.outer)<2&&Math.abs(parked.inner-after.inner)<2,label+' measurement preserves user scrolling');
 // Explicitly focus a real control after scrolling it away. Check its painted hit target.
 await page.evaluate(()=>{
  const port=document.querySelector('[aria-label="Home chat workspace"]'),target=document.querySelector('[data-guided-highlight="true"]')??[...port.querySelectorAll('button:not(:disabled),summary')].filter(node=>node.getClientRects().length).at(-1);
  port.focus({preventScroll:true});target.focus();
 });
 await page.waitForFunction(()=>{
  const target=document.activeElement,rect=target.getBoundingClientRect(),dock=document.querySelector('.home-composer-dock'),header=document.querySelector('main > header'),fixed=getComputedStyle(dock).position==='fixed',top=fixed?header.getBoundingClientRect().bottom:0,bottom=fixed&&!dock.contains(target)?dock.getBoundingClientRect().top:innerHeight;
  return rect.top>=top&&rect.bottom<=bottom&&target.contains(document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2));
 });
 assert.equal(await page.getByLabel('Ask Workforce AI',{exact:true}).inputValue(),draft,label+' scrolling/focus preserves draft');
 await page.evaluate(({outer,inner})=>{scrollTo({top:outer,behavior:'instant'});document.querySelector('[aria-label="Home chat workspace"]').scrollTop=inner;},{outer:geometry.outer,inner:geometry.port.scrollTop});
 return true;
}
