import {sha256} from './read-provider.mjs';
import {DASHBOARD_CONTRACT,readCompanyDashboard} from './company-dashboard.mjs';
export function createCompanyDashboard(binding){
 const token=`invented-company-${sha256(binding.token)}:1`;
 const trend=binding.read('/api/headcount-trend',{datasetToken:binding.token}).body;
 const value={contract:DASHBOARD_CONTRACT,companyKey:binding.identity.companyKey,datasetToken:token,asOf:binding.identity.asOf,scope:'company',capabilities:['headcount','fte','recorded_headcount_change'],overview:{...trend.at(-1)},trend};
 return {token,value:readCompanyDashboard(value,token,binding.identity)};
}
