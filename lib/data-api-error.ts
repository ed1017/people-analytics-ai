import {randomUUID} from 'node:crypto';

const publicErrors={
 workforce:'Workforce analytics are temporarily unavailable. Please try again.',
 'survey-sentiment':'Employee Listening data is temporarily unavailable. Please try again.',
 'talent-acquisition':'Talent Acquisition data is temporarily unavailable. Please try again.',
 'workforce-planning':'Stored Planning data is temporarily unavailable. Please try again.',
 'scenario-modeler':'Scenario modeling source data is temporarily unavailable. Please try again.',
} as const;
export type DataApiSource=keyof typeof publicErrors;

/** Keep upstream messages, JWT details, SQL, URLs and credentials out of responses and logs. */
export function dataApiErrorResponse(source:DataApiSource,error:unknown):Response{
 const correlationId=randomUUID();
 const record=error&&typeof error==='object'?error as {code?:unknown;name?:unknown}:{};
 const code=typeof record.code==='string'&&/^(?:PGRST\d{3}|[0-5][A-Z0-9]{4})$/.test(record.code)?record.code:null;
 const errorType=typeof record.name==='string'&&['Error','TypeError','AbortError','TimeoutError'].includes(record.name)?record.name:'upstream_error';
 console.error('Data API unavailable',{source,correlationId,code,errorType});
 return Response.json({error:publicErrors[source],correlationId},{
  status:500,
  headers:{'Cache-Control':'no-store','X-Correlation-ID':correlationId},
 });
}
