import {homeAggregateTool} from './home-aggregate-tool.mjs';
export const homeDatasetQueryTool={type:'function',name:'read_dataset_questions',strict:true,
 description:'Read one to three factual dataset questions, including multipart requests and historical headcount/FTE. Every part is returned directly with its own scope/date/limitations; no model rewrite. Include every requested part. If more than three parts are requested, ask the user to prioritize rather than silently omit them. Do not use for planning, causal claims or inferred cross-domain joins. Historical stocks support only country, business-unit (org) and level intersections, using exact catalog codes. Never equate a department with a business unit. Resolve follow-ups from explicit conversation context; preserve prior filters and dates unless changed. Dates must be explicit month-ends; resolve relative dates against the documented application clock, never silently substitute current. For business-unit turnover, default to total_turnover_ytd_pct; use voluntary only when explicitly requested, never substitute counts or voluntary rates for total. A group ranking may use the supported business-unit dimension only when clearly labeled. Comparisons use existing complete-partition rules and only company-wide/current source dates. Unsupported parts use kind unsupported. '+'Registry: '+homeAggregateTool.description.split('Registry: ')[1],
 parameters:{type:'object',additionalProperties:false,required:['parts'],properties:{parts:{type:'array',minItems:1,maxItems:3,items:{type:'object',additionalProperties:false,required:['kind','history','comparison'],properties:{
 kind:{type:'string',enum:['history','comparison','unsupported']},
 history:{anyOf:[{type:'null'},{type:'object',additionalProperties:false,required:['metric','start','end','country','org','level'],properties:{metric:{type:'string',enum:['headcount','fte']},start:{type:'string',maxLength:10},end:{type:'string',maxLength:10},country:{type:'string',maxLength:100},org:{type:'string',maxLength:100},level:{type:'string',maxLength:100}}}]},
 comparison:{anyOf:[{type:'null'},homeAggregateTool.parameters]},
 }}}}}};

/** Sequential bounded reads. A failed provenance check aborts, not partial success. */
export async function readDatasetQuestions(args,{history,comparison,signal}){
 if(!args||Object.keys(args).length!==1||!Array.isArray(args.parts)||args.parts.length<1||args.parts.length>3)throw Error('One to three dataset questions are required.');
 const answers=[],charts=[];
 for(const part of args.parts){
  signal.throwIfAborted();
  if(!part||Object.keys(part).sort().join(',')!=='comparison,history,kind')throw Error('Invalid dataset question.');
  let result;
  if(part.kind==='history'&&part.history&&part.comparison===null)result=await history(part.history);
  else if(part.kind==='comparison'&&part.comparison&&part.history===null)result=await comparison(part.comparison);
  else if(part.kind==='unsupported'&&part.history===null&&part.comparison===null)result={answer:'The requested comparison is unavailable. Choose headcount/FTE history for a specific period, or ask for the latest company-wide comparison.'};
  else throw Error('Dataset question kind and arguments disagree.');
  signal.throwIfAborted();
  if(typeof result?.answer!=='string'||!result.answer.trim()||result.answer.length>8000)throw Error('Dataset answer exceeds its bounds.');
  if(result.chart)charts.push(result.chart);
  answers.push(args.parts.length===1?result.answer:`Part ${answers.length+1}\n\n${result.answer}`);
 }
 const answer=answers.join('\n\n---\n\n');
 if(answer.length>10000)throw Error('Combined dataset answer exceeds its bounds.');
 return {answer,charts};
}
