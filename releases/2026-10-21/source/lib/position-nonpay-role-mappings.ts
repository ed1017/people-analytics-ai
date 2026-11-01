import itSystems from './data/it-systems-nonpay-mapping-v1.json' with {type:'json'};
// Conditional non-pay mappings only. These do not change pay eligibility or verify vacancy duties.
// Stable internal role IDs resolve the Lab reference-title / current display-label distinction.
// @ts-expect-error Native tests share application source.
import {catalogDisplayLabel} from './catalog-display.ts';
export const POSITION_NONPAY_ROLE_MAPPINGS=Object.freeze([
 Object.freeze({roleId:'OPS-BUS',role:'Business Operations Specialist',countryCode:'US',onetCode:'13-1111.00',outlookCode:'13-1111',duties:'Use this reference only for a planned role analyzing organizational problems, procedures and operating methods and recommending process improvements; not routine administrative operations.',limit:'Conditional Management Analysts occupation reference, not a Business Operations Specialist-specific estimate. Matching reference tasks do not verify actual vacancy duties. Shared occupation figures are not additive across mapped roles.'}),
 Object.freeze({roleId:'HR-PA',role:'People Analytics Analyst',countryCode:'US',onetCode:'15-2051.00',outlookCode:'15-2051',duties:'Use this reference only for a planned role performing statistical workforce analysis and development or evaluation of predictive or statistical models; exclude reporting-only, dashboard-only and routine HR administration.',limit:'Conditional broader Data Scientists occupation reference, not a People Analytics-specific estimate. Matching reference tasks do not verify actual vacancy duties. Shared occupation figures are not additive across mapped roles.'}),
 Object.freeze(itSystems),
]);
for(const mapping of POSITION_NONPAY_ROLE_MAPPINGS)if(catalogDisplayLabel(mapping.roleId)!==mapping.role)throw Error('Conditional non-pay role identity changed.');
