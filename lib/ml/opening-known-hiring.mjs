// Separate synthetic educational model. No company/person records are accepted by an app route.
const FEATURES=['definedScope','panelReserved','flexibleStartWindow'];
const sigmoid=z=>1/(1+Math.exp(-Math.max(-30,Math.min(30,z))));
function vector(row,asOf){
 if(!Number.isFinite(Date.parse(asOf))||!Number.isFinite(Date.parse(row.openedAt))||
  row.openedAt>asOf||row.featuresAvailableAt>row.openedAt||!Number.isFinite(Date.parse(row.featuresAvailableAt)))throw Error('Features not known at opening');
 if(Object.keys(row.features).sort().join()!==[...FEATURES].sort().join()||FEATURES.some(k=>![0,1].includes(row.features[k])))throw Error('Only declared binary features allowed');
 return [1,...FEATURES.map(k=>2*row.features[k]-1)];
}
function solve(matrix,b){
 const a=matrix.map((r,i)=>[...r,b[i]]),n=b.length;
 for(let k=0;k<n;k++){
  let pivot=k;for(let i=k+1;i<n;i++)if(Math.abs(a[i][k])>Math.abs(a[pivot][k]))pivot=i;
  [a[k],a[pivot]]=[a[pivot],a[k]];
  if(Math.abs(a[k][k])<1e-12)throw Error('Singular model');
  const scale=a[k][k];for(let j=k;j<=n;j++)a[k][j]/=scale;
  for(let i=0;i<n;i++)if(i!==k){const f=a[i][k];for(let j=k;j<=n;j++)a[i][j]-=f*a[k][j];}
 }
 return a.map(r=>r[n]);
}
export function fitOpeningModel(rows,origin){
 if(rows.length<8)throw Error('Insufficient training cells');
 const keys=new Set();let total=0,positive=0;const cells={};
 const data=rows.map(r=>{
  const x=vector(r,origin);
  if(keys.has(r.key)||!Number.isInteger(r.openings)||r.openings<=0||!Number.isInteger(r.started)||r.started<0||r.started>r.openings||
   !Number.isFinite(Date.parse(r.labelAvailableAt))||r.labelAvailableAt>origin||Date.parse(r.labelAvailableAt)-Date.parse(r.openedAt)<90*86400000)throw Error('Invalid or immature training labels');
  keys.add(r.key);total+=r.openings;positive+=r.started;
  const key=x.slice(1).join(','),cell=cells[key]??{n:0,y:0};cell.n+=r.openings;cell.y+=r.started;cells[key]=cell;
  return {x,n:r.openings,y:r.started};
 });
 const pooled=(positive+1)/(total+2);let beta=[Math.log(pooled/(1-pooled)),0,0,0],converged=false;
 const loss=b=>data.reduce((sum,r)=>{const z=r.x.reduce((s,v,i)=>s+v*b[i],0);return sum+r.n*(Math.max(z,0)+Math.log1p(Math.exp(-Math.abs(z))))-r.y*z;},b.reduce((s,v,i)=>s+.5*(i?1:1e-6)*v*v,0));
 for(let iteration=0;iteration<100;iteration++){
  const g=beta.map((b,i)=>b*(i?1:1e-6)),h=beta.map((_,i)=>beta.map((_,j)=>i===j?(i?1:1e-6):0));
  for(const r of data){const p=sigmoid(r.x.reduce((s,v,i)=>s+v*beta[i],0)),w=r.n*p*(1-p);
   for(let i=0;i<4;i++){g[i]+=(r.n*p-r.y)*r.x[i];for(let j=0;j<4;j++)h[i][j]+=w*r.x[i]*r.x[j];}}
  // Normalize gradient by exposure to avoid false non-convergence from summed-loss rounding.
  if(Math.max(...g.map(Math.abs))/total<1e-9){converged=true;break;}
  const step=solve(h,g);if(Math.max(...step.map(Math.abs))<1e-7){converged=true;break;}
  let scale=1;const old=loss(beta);
  while(scale>1e-10&&loss(beta.map((b,i)=>b-scale*step[i]))>old)scale/=2;
  if(scale<=1e-10)throw Error('Optimization did not descend');
  beta=beta.map((b,i)=>b-scale*step[i]);
 }
 if(!converged)throw Error('Model did not converge');
 return {version:'opening-known-logistic-v1',origin,beta,pooled,cells,trainingOpenings:total,trainingCells:rows.length};
}
export function predictOpeningModel(model,row,asOf=row.openedAt){
 if(model.version!=='opening-known-logistic-v1'||asOf<model.origin)throw Error('Invalid model or prediction time');
 const x=vector(row,asOf),cell=model.cells[x.slice(1).join(',')];
 return {'pooled-rate':model.pooled,'cell-rate':cell?(cell.y+1)/(cell.n+2):model.pooled,
  'logistic-features':sigmoid(x.reduce((s,v,i)=>s+v*model.beta[i],0))};
}
