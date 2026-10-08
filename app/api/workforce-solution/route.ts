import { withDatasetRequest } from "@/lib/dataset-runtime";
import {NextRequest,NextResponse} from "next/server";
import {getStructuralPositionCatalog,runStructuralPositionScenario} from "@/lib/structural-position-scenario";
import {runRoleWorkforceResponsePlan} from "@/lib/role-workforce-response-plan";
import {calculateWorkforceIncrement,validateWorkforcePlanInput} from "@/lib/workforce-increment";
import type {StructuralPositionAction} from "@/lib/types";
export const dynamic="force-dynamic";
export const maxDuration=60;
async function handlePOST(request:NextRequest){
 let input;
 try{const text=await request.text();if(text.length>16000)throw Error('Request too large.');input=validateWorkforcePlanInput(JSON.parse(text));}
 catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Invalid workforce inputs.'},{status:400})}
 try{
  request.signal.throwIfAborted();
  const catalog=await getStructuralPositionCatalog();
  const combinations=catalog.combinations.filter(row=>row.org_code===input.businessUnit&&row.job_profile_code===input.jobProfile);
  if(!combinations.length)return NextResponse.json({error:'The selected role and business unit are not a supported structural combination.'},{status:400});
  if(input.planningMonth<=catalog.as_of.slice(0,7))return NextResponse.json({error:'Start the incremental plan after the workforce snapshot month.'},{status:400});
  const action:StructuralPositionAction={action_type:'add_positions',business_unit:input.businessUnit,job_profile:input.jobProfile,level:null,amount:Number(input.roles),fill_pct:null};
  const structural=await runStructuralPositionScenario([action]);request.signal.throwIfAborted();
  const selectedRole=structural.job_profile_impact.find(row=>row.job_profile_code===input.jobProfile);
  const selectedDestination=structural.business_unit_job_profile_impact.find(row=>row.org_code===input.businessUnit&&row.job_profile_code===input.jobProfile);
  if(structural.as_of!==catalog.as_of||!selectedRole||!selectedDestination||Math.abs(selectedDestination.authorized_position_delta-Number(input.roles))>.01)throw Error('Structural source or applied demand changed; no consistent workforce result was saved.');
  const response=await runRoleWorkforceResponsePlan({actions:[action],job_profile:input.jobProfile,allocation:{build:Number(input.build),move:Number(input.move),buy:Number(input.buy),borrow:0,automate:0}},structural);request.signal.throwIfAborted();
  if(response.external_recruiting_feasibility.as_of!==catalog.as_of)throw Error('Recruiting and workforce snapshot dates do not match.');
  const timing=response.external_recruiting_feasibility.timing_evidence??null;
  const proposed=calculateWorkforceIncrement(input,timing);
  const hireOnly=calculateWorkforceIncrement({...input,build:'0',move:'0',buy:input.roles,backfills:'0',internalAnnualCostChange:'0',trainingCash:'0',trainingHours:'0'},timing);
  const costBasisKnown=combinations.every(row=>typeof row.annual_cost_per_position_usd==='number'&&Number.isFinite(row.annual_cost_per_position_usd)&&row.annual_cost_per_position_usd>0);
  return NextResponse.json({version:1,calculatedAt:new Date().toISOString(),input,source:{asOf:catalog.as_of,provenance:'synthetic company aggregate',businessUnit:catalog.business_units.find(row=>row.org_code===input.businessUnit),jobProfile:catalog.job_profiles.find(row=>row.job_profile_code===input.jobProfile)},structural:{actions:structural.actions,current:structural.current,modeled:structural.modeled,selectedRole,selectedDestination,authorizedAnnualBudgetDelta:costBasisKnown?structural.modeled.authorized_budget_delta_usd:null,costBasisCoverage:costBasisKnown?'All selected catalog combinations have positive stored cost bases':'Missing or nonpositive stored cost basis; authorized budget is unknown',costBasisPeriod:'Stored Baseline December 2027 annual cost per planned position; not a current salary quote'},response,timing,proposed,hireOnly,limitations:['Internal readiness is retrieved at calculation time and has no independent as-of marker; do not treat the workforce snapshot date as a verified readiness assessment date.','The business unit identifies the destination requirement. Internal readiness and recruiting history are company-wide for the role; they are not BU- or location-filtered supply.','Two deterministic comparisons, not an AI-optimized response mix. User must review feasibility warnings and explicitly revise inputs.','Structural positions are added as vacancies; conditional Build/Move/Buy coverage is not an actual staffing or approval action.','Training suitability, internal release and source backfill availability remain unverified.','The hire-only alternative uses the same explicit salary, hiring fee and common arrival assumption; it does not infer a larger recruiting capacity.']},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return NextResponse.json({error:request.signal.aborted?'Calculation cancelled. Previous results remain.':error instanceof Error?error.message:'Approved workforce source unavailable.'},{status:request.signal.aborted?408:503})}
}

export async function POST(request:NextRequest) {
  return withDatasetRequest(request, () => handlePOST(request));
}
