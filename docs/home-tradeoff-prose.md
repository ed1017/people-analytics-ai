# Complete Action Plan limitations

Local source checkpoint `ebf4d9fd09c6b4b63b810fba9c51b6b0d80c79ec` starts from preserved PR132 head `c44f0b985f2f08e703607c6e7c049841304e557f`. This work was not included in PR132's release.

## Traced cause and limits of attribution

No application substring operation, text-overflow ellipsis or line clamp was found on bundle limitation, coordination or component limitation rendering. The schema bounds those strings (bundle limitation240, component limitation200, objective160, coordination240, first step360 characters). The validator checked shape/length and stored accepted strings unchanged; it did not establish sentence completeness. A fresh completed response ending with a dangling connector or an unpunctuated word at the exact character bound was therefore accepted. The original hosted raw response was not captured, so this establishes a reproducible acceptance gap, not proof that the original fragment was model-generated.

A separate definite rendering defect was reproduced: `currentResult?.issues[0] ?? bundle.limitation` replaced the whole original bundle limitation with the first calculation issue after calculation. Storage still retained the original limitation. This could hide material tradeoffs even when their source text was complete.

## Bounded correction

Why these plans now always displays the complete supplied bundle limitation as Plan limitations. Calculation issues remain separately visible in the existing shared ledger, including all issues rather than an excerpt. Component limitations remain complete. No new competing control, widened field, expanded model-input envelope, text clipping or automatic rewriting is introduced.

Fresh response handling now rejects narrowly detectable unfinished prose using the existing `incomplete_output` diagnostic: a prose field at its character bound without sentence-ending punctuation, or a field ending in a dangling separator/connector (such as “and”). The handler makes exactly one request and never retries, fabricates the ending or saves a partial proposal. The schema's limitation description asks for complete shortened sentences. The existing strict-schema byte budget and all field bounds are unchanged; the first verbose description draft exceeded the existing format test and was shortened, not given a larger budget.

These checks are conservative syntactic signals, not proof of grammatical completeness or truth. A shorter malformed sentence that has no detectable ending can still pass, and existing saved text remains intact. Any already incomplete saved wording needs explicit review; missing source text cannot be recovered or truthfully invented. The rendering fix preserves everything that actually exists in Details/Why these plans.

## Validation

- **1,194 unit tests passed**, zero failures/skips. Fresh rejection makes one call, valid long prose survives byte-for-byte, and legacy stored text remains readable. Strict schema checks retain the original <8KB format budget.
- **21 new browser checks passed** across desktop, mobile and 200%-equivalent reflow. A complete natural-language240-character limitation and long component limitations remain visible before/after calculation, in the attachment snapshot and after reload. The original text wraps without clipping or horizontal overflow. A deliberately unfinished fresh limitation rejects and stays rejected after reload without automatic retries or attachment.
- Full lint, standalone TypeScript, optimized production build, whitespace and public analysis-artifact verification pass. Analysis artifacts are unchanged.
- **204 current browser regression checks passed**: preparation resilience45, unified attachment117 and evidence-scope honesty42. Together with the new21, **225 browser checks passed** on this source.

Logs `/tmp/tradeoff-final-{unit,lint,tsc,build}.log`, `/tmp/tradeoff-browser.log`, `/tmp/tradeoff-regression-browser-summary.json`, `/tmp/tradeoff-artifact.log`; screenshots `/tmp/tradeoff-{desktop,mobile,zoom}.png`. Browser data/model calls are intercepted synthetic fixtures. No live API or credential diagnostic, database/schema, security/access, held eNPS or palette work. Local checkpoint only; no push or release of this change.
