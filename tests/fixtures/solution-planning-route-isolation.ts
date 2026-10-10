import {verifySolutionEvidence,AggregateEvidenceReadError} from '../../lib/home-solution-grounding.mjs';
import {dataApiErrorResponse} from '../../lib/data-api-error';
// Offline construction harness: no database/auth/provider transport is exercised.
export {default,openAIProxyTransport} from './home-route-isolation';
export const datasetRouter={current:()=>({token:'legacy-v1:0'})};
export const withDatasetRequest=async(_request:Request,run:()=>unknown)=>run();
export const datasetAI=async(run:()=>unknown)=>run();

// Ordinary UI fixtures isolate database I/O; source tests inject aggregate results into the real verifier.
export const groundSolutionRequest=async(request:unknown,signal:AbortSignal)=>{
 const fixture=globalThis as unknown as {__aggregateSources?:Record<string,unknown>;__grounding?:unknown;__aggregateReads?:string[];__aggregateFailure?:{reader:string;status:number;code?:string};__aggregateRead?:(key:string,signal:AbortSignal)=>Promise<unknown>};
 if(fixture.__aggregateSources)return verifySolutionEvidence(request,{datasetToken:'legacy-v1:0',read:async(key:string,_filters:unknown,readSignal:AbortSignal)=>{
  fixture.__aggregateReads?.push(key);
  if(fixture.__aggregateFailure?.reader===key){
   if(fixture.__aggregateFailure.code)throw AggregateEvidenceReadError.fromResponse(dataApiErrorResponse('workforce',{code:fixture.__aggregateFailure.code,message:'PRIVATE_SYNTHETIC_AUTH_DETAIL'}));
   throw new AggregateEvidenceReadError('http_error',fixture.__aggregateFailure.status);
  }
  if(fixture.__aggregateRead)return fixture.__aggregateRead(key,readSignal);return fixture.__aggregateSources?.[key]??{status:'unavailable',data:null};
 }},signal);
 return fixture.__grounding??{version:1,datasetToken:'legacy-v1:0',retrievedAt:'2026-10-09T00:00:00Z',sources:[],verification:'SYNTHETIC offline source port; not live evidence verification.'};
};
