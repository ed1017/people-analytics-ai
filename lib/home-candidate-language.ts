// Conservative English grammar for qualitative candidates, not an efficacy classifier.
// Validation normalizes for inspection only: accepted display text is never rewritten.
const action='determine|document|summarize|distinguish|find out|investigate|test|consider|review|assess|explore|clarify|understand|identify|examine|evaluate|compare|check|learn|gather|map|analyse|analyze';
const actionStart=new RegExp(`^(?:(?:to|aim to) )?(?:${action})\\b`,'i');
const outcomeNoun=/^(?:(?:a|an) )?(?:better understanding|clearer (?:understanding|picture|view)|understanding|clarification|evidence (?:to|for)|insight into|assessment of|comparison of|review of)\b/i;
const numbers=/\p{N}|[$€£%]|\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|dozen|half|quarter|double[sd]?|doubling|triple[sd]?|tripling|twofold|threefold|fourfold|tenfold|percent|percentage|per cent)\b/iu;
const certainty=/\b(will|guarantee[ds]?|proven|proof|prove[sd]?|caus(?:e[ds]?|al(?:ity)?|ation)|ensure[sd]?|certain(?:ly)?|definitely|always|inevitably|effective|successful|beneficial|leads? to|results? in|drives?|attributable to)\b/i;
const effect=/\b(reduc(?:e[sd]?|ing)|improv(?:e[sd]?|ing)|increas(?:e[sd]?|ing)|boost(?:s|ed|ing)?|prevent(?:s|ed|ing)?|eliminat(?:e[sd]?|ing)|sav(?:e[sd]?|ing)|deliver(?:s|ed|ing)?|solv(?:e[sd]?|ing)|fix(?:es|ed|ing)?|cut(?:s|ting)?|retain(?:s|ed|ing)?|rais(?:e[sd]?|ing))\b/i;
const subject='(?:this|that|it|the (?:evidence|pattern|signal|association)|these (?:data|patterns|signals|associations)|(?:historical|recorded) associations?)';
const causal='(?:causation|causality|(?:a |an )?(?:causal (?:link|effect|relationship)|cause|effect)|causal (?:links|effects|relationships)|causes|effects)';
const positivePredicate=/\b(?:it|this|coaching|training|the (?:program|programme|intervention|approach)) (?:works|is (?:effective|successful|beneficial))\b/i;
const caveats=[
 new RegExp(`^(?:${subject} (?:is|are) )?(?:not|no) (?:(?:a|an) )?(?:proven (?:cause|effect|benefit)s?|proof of ${causal}|evidence of ${causal}|causal(?: evidence)?)$`,'i'),
 new RegExp(`^(?:association|correlation) is not (?:causation|causality)$`,'i'),
 new RegExp(`^${subject} (?:does|do) not (?:prove|establish|demonstrate|show) ${causal}$`,'i'),
 new RegExp(`^(?:no )?${causal} (?:has|have) (?:not )?been (?:proven|established|demonstrated)$`,'i'),
 /^(?:the )?(?:benefits?|effects?|causality|causation|causal effects?) (?:is|are|remains?|remain) (?:not (?:proven|guaranteed)|unproven|unknown|unverified)$/i,
 /^(?:causation|causality|a causal link|causal effects?) (?:cannot|can't) be (?:inferred|established|assumed)$/i,
 /^(?:association|correlation) rather than (?:causation|causality)$/i,
 /^(?:there (?:is|are) )?no guaranteed (?:benefits?|effects?|improvements?)$/i,
];
function safeCaveat(clause:string){
 // Passive claims need explicit negation; 'causation has been proven' must never pass.
 if(caveats.some(pattern=>pattern.test(clause))&&(clause.match(/\b(no|not|unproven|unknown|unverified|cannot|can't|rather than)\b/g)?.length===1))return true;
 // One clause of absent evidence, without nested negation or assertions of certainty.
 const tail=clause.match(/^(?:(?:this|it|the effect) is )?not proven to (.+)$/)?.[1]
  ??clause.match(/^(?:there is )?no evidence that (.+)$/)?.[1];
 return !!tail&&!/\b(no|not|never|only|will|guarantee[ds]?|certain(?:ly)?|always)\b/.test(tail)&&effect.test(tail)&&(tail.match(new RegExp(effect.source,'gi'))?.length===1)&&!certainty.test(tail)&&!positivePredicate.test(tail);
}
export function homeCandidateLanguage(title:string,outcome:string,why:string):'wording_rejected'|'numeric_or_effect_token'|null{
 const originals=[title,outcome,why];
 // Reject hidden controls, non-Latin lookalikes and numeric glyphs rather than silently cleaning them.
 if(originals.some(text=>numbers.test(text)||/[\p{Cf}\p{Cc}]|[\p{Script=Cyrillic}\p{Script=Greek}]/u.test(text)))return 'numeric_or_effect_token';
 const fields=originals.map(text=>text.normalize('NFKC').replace(/[’‘]/g,"'").toLowerCase().replace(/\s+/g,' ').trim());
 if(fields.some(text=>numbers.test(text)))return 'numeric_or_effect_token';
 for(const text of fields){
  for(const word of ['will','guaranteed','proven']){const pattern=new RegExp(`\\b${word.split('').join('[ ._-]*')}\\b`,'g');if([...text.matchAll(pattern)].some(match=>match[0]!==word))return 'numeric_or_effect_token';}

  // Punctuation and contrast/coordinating boundaries prevent one denial from blessing another assertion.
  const clauses=text.split(/[.!?;,:\n—–]+|\b(?:but|however|yet|although|whereas|nevertheless|therefore|hence|because|since|and|or|while|except|unless|despite|so|still|also|then)\b/).map(s=>s.trim()).filter(Boolean);
  for(const clause of clauses){
   if(safeCaveat(clause))continue;
   if(certainty.test(clause)||positivePredicate.test(clause))return 'numeric_or_effect_token';
   // Effect verbs are only permitted inside an explicit investigation question, never as an asserted benefit.
   if(effect.test(clause)&&!(new RegExp(`^(?:(?:to|aim to) )?(?:${action}) (?:whether|if)\\b`,'i').test(clause)&&clause.match(new RegExp(effect.source,'gi'))?.length===1))return 'numeric_or_effect_token';
  }
 }
 if(!(actionStart.test(fields[1])||outcomeNoun.test(fields[1])))return 'wording_rejected';
 return null;
}
