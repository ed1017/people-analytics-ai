/** Synthetic aggregates only. This transport never connects to a database. */
export function freshSkillClient(){
 const state={headcount:17,error:null,rejection:null,pending:null,calls:[]};
 const gaps=[{skill_id:'s1',skill_code:'S1',skill_name:'Synthetic skill',skill_category:'Synthetic',employees_in_roles_requiring_skill:10,employees_with_observed_proficiency:8,employees_meeting_requirement:6,employees_below_or_missing_requirement:4,avg_required_proficiency:3,avg_observed_proficiency:2,avg_proficiency_gap:1,profile_coverage_pct:80,requirement_met_pct:60,avg_requirement_weight:1}];
 const client={from(table){
  const query={table,columns:'*',signal:undefined,single:false};
  const builder={
   select(columns,options){query.columns=columns;query.options=options;return builder;},
   abortSignal(signal){query.signal=signal;return builder;},
   single(){query.single=true;return builder;},
   eq(){return builder;},
   then(resolve,reject){
    state.calls.push({...query});
    const execute=async()=>{
     if(state.pending)await state.pending;
     if(state.rejection)throw state.rejection;
     const rows=table==='skills_proficiency_gap_summary'?gaps:table==='dashboard_overview_current'?[{headcount:state.headcount}]:[];
     const data=rows.map(row=>query.columns==='*'?{...row}:Object.fromEntries(query.columns.split(',').map(s=>s.trim()).map(key=>[key,row[key]])));
     return {data:state.error?null:query.single?data[0]??null:data,error:state.error,count:query.options?.count?rows.length:null,status:state.error?500:200,statusText:state.error?'Failure':'OK'};
    };
    return execute().then(resolve,reject);
   },
  };return builder;
 }};
 return {client,state};
}
