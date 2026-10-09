// Offline construction harness: no database/auth/provider transport is exercised.
export {default,openAIProxyTransport} from './home-route-isolation';
export const datasetRouter={current:()=>({token:'legacy-v1:0'})};
export const withDatasetRequest=async(_request:Request,run:()=>unknown)=>run();
export const datasetAI=async(run:()=>unknown)=>run();
