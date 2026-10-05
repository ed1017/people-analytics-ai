import {createHash} from 'node:crypto';
export const DAY = 86400000;
export const canonical = value => JSON.stringify(value, function(key, item) {
  return item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(k => [k,item[k]])) : item;
});
export const digest = value => createHash('sha256').update(typeof value === 'string' ? value : canonical(value)).digest('hex');
export function rng(seed, stream) {
  let state = Number.parseInt(digest({seed,stream}).slice(0,8),16) >>> 0;
  return () => { state = (Math.imul(state,1664525)+1013904223) >>> 0; return state/4294967296; };
}
export const integer = (random, low, high) => low+Math.floor(random()*(high-low+1));
export function binomial(random, n, p) {
  if (!Number.isSafeInteger(n) || n<0 || !Number.isFinite(p) || p<0 || p>1) throw Error('Invalid binomial configuration');
  let value=0; for(let i=0;i<n;i++)if(random()<p)value++; return value;
}
export const firstDay = month => `${month}-01T00:00:00.000Z`;
export function monthAdd(month, n) { const [y,m]=month.split('-').map(Number);return new Date(Date.UTC(y,m-1+n,1)).toISOString().slice(0,7); }
export const dayAdd = (stamp,n) => new Date(Date.parse(stamp)+n*DAY).toISOString();
export const monthEnd = month => new Date(Date.parse(firstDay(monthAdd(month,1)))-1).toISOString();
export const monthsFor = config => Array.from({length:config.months},(_,i)=>monthAdd(config.startMonth,i));
export function release(key, revision, effectiveAt, simulatedAvailableAt, value, status='complete') {
  return {recordKey:key,revision,supersedes:revision===1?null:revision-1,effectiveAt,simulatedAvailableAt,sourceObservedAt:null,status,value};
}
