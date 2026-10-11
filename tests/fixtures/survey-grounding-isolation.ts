// Query-builder transport only; the routes, dataset gate and verifier remain real.
export {NextRequest,NextResponse} from './dashboard-grounding-isolation';
export const supabaseServer={from:(table:string)=>{
 const operations:unknown[][]=[];
 const query={
  select:(columns:string)=>{operations.push(['select',columns]);return query;},
  single:()=>{operations.push(['single']);return query;},
  order:(column:string,options:unknown)=>{operations.push(['order',column,options]);return query;},
  then:(resolve:(value:unknown)=>unknown,reject:(error:unknown)=>unknown)=>Promise.resolve().then(()=>{
   const fixture=globalThis as unknown as {__query:(table:string,operations:unknown[][])=>Promise<unknown>};
   return fixture.__query(table,operations);
  }).then(resolve,reject),
 };return query;
}};
