import type {BundleProposal} from './home-solution-bundles';
import type {BundleResponseDiagnostic} from './home-bundle-response-diagnostic';

// A bounded fresh-output check, not a language model or proof of semantic completeness.
// Inspection never edits text. Length alone and absent sentence punctuation are not failures.
const auxiliaries='am|is|are|was|were|be|been|being|have|has|had|do|does|did|can|could|may|might|must|shall|should|will|would';
const contractions="cannot|can't|couldn't|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|doesn't|don't|didn't|won't|wouldn't|shouldn't|mustn't|mightn't|needn't|shan't";
const modifiers='not|yet|still|also|only|already|currently|necessarily|fully|been|be|being|have|has|had|to';
const predicate=`(?:${auxiliaries}|${contractions}|(?:ought|need|needs)\\s+to)(?:\\s+(?:${modifiers})){0,4}`;
const unfinishedPredicate=new RegExp(`(?:^|\\s)${predicate}$`);
const indirectReview=new RegExp(`\\b(?:review|clarify|explain|describe|identify|understand) (?:what|where|who|how) (?:[\\w'-]+ ){1,12}${predicate}$`,'i');
export function incompleteBundleProse(text:string):boolean{
 const value=text.trim().replace(/[’]/g,"'");
 // Closing quotes/brackets and a final full stop do not finish an absent predicate.
 const unwrapped=value.replace(/["'”)\]]+$/g,'');
 if(/(?:[,:;—–-]|\.\.\.|…)$/.test(unwrapped))return true;
 const ending=unwrapped.replace(/[.!?]$/,'').replace(/["'”)\]]+$/g,'').trimEnd();
 if(/(?:^|\s)(?:and|or|but|because|including)$/.test(ending))return true;
 if(!unfinishedPredicate.test(ending))return false;
 // These complete forms describe existing state or ask about it, rather than assert a missing predicate.
 if(/\bas (?:is|it is|they are|it was|they were)$/.test(ending)||indirectReview.test(ending))return false;
 return true;
}
export function incompleteBundleTextField(proposal:BundleProposal):BundleResponseDiagnostic['textField']{
 for(const bundle of proposal.bundles){
  for(const field of ['objective','coordination','limitation'] as const)if(incompleteBundleProse(bundle[field]))return field;
  for(const component of bundle.components){
   if(incompleteBundleProse(component.firstStep))return 'firstStep';
   if(incompleteBundleProse(component.limitation))return 'component_limitation';
  }
 }
 return null;
}
