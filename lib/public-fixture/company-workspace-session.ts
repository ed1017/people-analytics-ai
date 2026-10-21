// Local synthetic acceptance adapter only. No production selector or HTTP endpoint.
import {DatasetSession} from '../../releases/2026-10-21/source/lib/dataset-client.mjs';
// @ts-expect-error Native Node tests use the exact versioned TypeScript source.
import {DecisionStore} from '../../releases/2026-10-21/source/lib/local-decisions.ts';
import {readCompanyDashboard} from './company-dashboard.mjs';

type Port={getItem:(key:string)=>string|null;setItem:(key:string,value:string)=>unknown;removeItem:(key:string)=>unknown};
type Dashboard=ReturnType<typeof readCompanyDashboard>;
type Selection={activationToken:string;snapshotToken:string;companyKey:string;asOf:string};

/** Transport generations order activations; immutable snapshot tokens key storage.
 * Returning to a snapshot reopens its workspace without reviving old responses.
 * Goals, evidence and drafts never transfer automatically across snapshots.
 */
export class CompanyWorkspaceSession {
 private registry=new Map<string,Dashboard>();
 private session=new DatasetSession(undefined,{requireBootstrap:true});
 private selected:Selection|null=null;
 private store:DecisionStore|null=null;
 private pending=new Map<string,DecisionStore>();
 private storage:Port;
 private recovery:Port;
 constructor(dashboards:Dashboard[],storage:Port,recovery:Port){
  this.storage=storage;this.recovery=recovery;
  if(!Array.isArray(dashboards)||!dashboards.length||dashboards.length>20)throw Error('Invalid fixture registry');
  for(const d of dashboards){
   const checked=readCompanyDashboard(d,d.datasetToken,{companyKey:d.companyKey,asOf:d.asOf});
   if(this.registry.has(checked.datasetToken))throw Error('Duplicate fixture snapshot');
   this.registry.set(checked.datasetToken,checked);
  }
 }
 current(){return this.selected?{...this.selected}:null;}
 workspace(){if(!this.store)throw Error('No company selected');return this.store;}
 /** Recovery is reviewable without activating or displaying the target company. */
 pendingWorkspace(snapshotToken:string){return this.pending.get(snapshotToken)??null;}
 select(snapshotToken:string){
  const dashboard=this.registry.get(snapshotToken);if(!dashboard)throw Error('Unregistered fixture snapshot');
  if(this.selected?.snapshotToken===snapshotToken)return this.current();
  this.store?.invalidateExternalChange();
  if(this.store&&!this.store.getSnapshot().saved)throw Error('Save or resolve the current workspace before switching');
  const generation=Number(this.session.current().split(':')[1])+1;
  if(!Number.isSafeInteger(generation)||generation>999999999999)throw Error('Activation generation exhausted');
  const activationToken=snapshotToken.replace(/:1$/,':'+generation);
  const next=this.pending.get(snapshotToken)??new DecisionStore(snapshotToken); // No prior-company goal seed.
  this.pending.set(snapshotToken,next);
  next.initialize(this.storage,undefined,this.recovery);
  next.invalidateExternalChange();
  if(!next.getSnapshot().ready||!next.getSnapshot().saved||next.getSnapshot().recovery)throw Error('Target workspace requires recovery; selection unchanged');
  this.session.bootstrap(activationToken);
  this.pending.delete(snapshotToken);
  this.store=next;this.selected={activationToken,snapshotToken,companyKey:dashboard.companyKey,asOf:dashboard.asOf};
  return this.current();
 }
 /** A caller captures this before starting work; only its matching completion may render. */
 capture(){if(!this.selected)throw Error('No company selected');return {...this.selected};}
 accept(captured:Selection,payload:unknown){
  if(!this.selected||captured.activationToken!==this.session.snapshot()||captured.snapshotToken!==this.selected.snapshotToken||captured.companyKey!==this.selected.companyKey||captured.asOf!==this.selected.asOf)throw Error('Superseded company response');
  return readCompanyDashboard(payload,captured.snapshotToken,{companyKey:captured.companyKey,asOf:captured.asOf});
 }
}
