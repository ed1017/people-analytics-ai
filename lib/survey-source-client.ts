import { datasetSession } from "./dataset-client.mjs";
import {readHomeSource} from './home-pack.mjs';
// @ts-expect-error Native Node tests share TypeScript source.
import {SourceRequests,type SourceResult} from './source-request-cache.ts';
export type SurveySourceResult = SourceResult;
/** One company-wide source per browser session. No timers trigger requests or retries. */
export class SurveySourceRequests extends SourceRequests {}
export const surveyRequests=new SurveySourceRequests(()=>readHomeSource('/api/survey-sentiment',undefined));
surveyRequests.useDataset(datasetSession.current());
datasetSession.subscribe(()=>surveyRequests.useDataset(datasetSession.current()));
export const readSurveySource=(signal?:AbortSignal)=>surveyRequests.read(signal);
export const refreshSurveySource=()=>surveyRequests.invalidate();
