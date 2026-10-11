import React from 'react';
import {createRoot} from 'react-dom/client';
import {ChatContent} from '../../components/chat-content';
import {SolutionProjectionChart} from '../../components/home-solution-conversation-review';
import {SwpOutcomeChart} from '../../components/swp-outcome-chart';
import type {BundleDraft} from '../../lib/home-bundle-reconciliation';
import type {SwpOption} from '../../lib/swp-demo';
import {SyntheticDomainDemo} from '../../components/synthetic-domain-demo';
import {SyntheticPayDemoPanel} from '../../components/synthetic-pay-demo';
import type {HeadcountProjection} from '../../lib/home-solution-projection';

const points = Array.from({length:6},(_,i)=>({month:`${2026+Math.floor((9+i)/12)}-${String((9+i)%12+1).padStart(2,'0')}-01`,opening:10000-i*15,hires:100,exits:115,transfersIn:0,transfersOut:0,headcount:9985-i*15,reference:null}));
const analysis = {
 id:'compact-fixture',revision:1,inputs:{asOf:'2026-09-30',opening:10000,scope:'Company-wide',relations:['offline fixture'],datasetVersion:null},
 points,assumptions:{monthly_hires:100,monthly_exits:115},interpretations:['Monthly hires and exits remain constant in this illustrative scenario.'],
 limitations:['Assumption-based scenario, not a trained forecast or a promised outcome.','No intervention effectiveness, savings, staffing availability or funding is inferred.'],inputDigest:'a'.repeat(64),
} as unknown as HeadcountProjection;
const answer='With these illustrative assumptions, headcount could reach **9,910** in March 2027.\n\nCompany-wide · as of 30 September 2026 · simulated scenario, not a trained forecast.\n\n| Month-end | Scenario headcount |\n| --- | --- |\n'+points.map(p=>`| ${new Date(p.month.slice(0,7)+'-01').toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'})} | ${p.headcount.toLocaleString('en-US')} |`).join('\n')+'\n\nAll three methods are shown; none is selected as best. Results are scenario-dependent and miss unannounced reversals. Confidence intervals and operational forecasts are unavailable; method differences are not uncertainty bands.\n\n**Important caveat:** This simulated scenario assumes 100 hires and 115 exits each month. The inputs are held steady for illustration. Individual departures can vary.\n\nThis unlabelled caveat sentence stays visible.\n\nImportant caveat: The analysis covers permanent staff.\n\nImportant caveat: The dataset omits contractors.\n\nImportant caveat: The population excludes agency staff and interns.';
createRoot(document.getElementById('root')!).render(<main className="evidence-workspace space-y-3 p-4">
 <h1 className="text-lg font-semibold">Workforce AI · compact output fixture</h1>
 <ChatContent content={answer} compact/>
 <SolutionProjectionChart analysis={analysis}/>
 <section aria-label="Wide table fixture"><ChatContent content={'| Month | Opening | Hires | Exits | Transfers in | Transfers out | Closing |\n| --- | --- | --- | --- | --- | --- | --- |\n| October 2026 | 10,000 | 100 | 115 | 0 | 0 | 9,985 |'}/></section>
 <SwpOutcomeChart draft={{inputs:{scope:{demand:{value:12},startMonth:{value:'2026-10'},months:{value:6},population:{value:'Illustrative role slice'}}}} as BundleDraft} options={[{id:'fixture',label:'Illustrative plan',candidate:{mix:{build:2,move:2,buy:8}},coverage:[4,6,8,10,12,12]}] as SwpOption[]}/>
 <SyntheticDomainDemo domain="turnover"/>
 <SyntheticPayDemoPanel/>
 <p role="alert">Calculation unavailable: review missing costs before saving.</p>
 <button type="button" className="min-h-11 rounded border px-3">Review before saving</button>
</main>);
