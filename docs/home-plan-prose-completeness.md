# Shared fresh-proposal completeness checks

## Reproduction and transformation audit

PR148 `a50b276d8ad190c7e169adac26e7a6dc66f59550` accepted the reported Plan2 limitation ending `cost against the USD 20,000 planning budget; feasibility is not`. A bounded fixture reproduces acceptance on that head. The exact unseen prefix is not reconstructed.

The source pipeline does not clip limitation strings:

1. `inspectHomeBundleOutput` parses complete JSON and enforces the byte cap. `inspectHomeBundleProposal` validates lengths, references and dependencies, converts component slots to arrays and removes fresh-only activity metadata. It copies prose unchanged; over-limit text rejects instead of being shortened.
2. `inspectBundleResponse` checks provider completion and fresh prose before returning a proposal.
3. `createHomeBundlePreparation` validates and saves the proposal with its exact binding; cache reads preserve previously stored content.
4. `createBundleDraft`, the starting-estimate preset, calculation records and attachment snapshots clone the bundle. They change or review numeric inputs without shortening bundle prose.
5. `bundleDisplayText` replaces exact c1–c6 tokens with component names. The UI displays the limitation followed by its standard owner disclaimer; it does not trim the limitation at a word or character boundary.

The hosted ending therefore exposed a gap in fresh-output validation. There is no application-held continuation to recover, and no justification for inventing one or hiding the limitation.

## Bounded correction

`home-bundle-text-completeness.ts` is the shared fresh-text check for both the API response and the client preparation commit. It inspects objective, coordination, plan limitation, first step and component limitation. It detects auxiliary chains and negation, including `is not`, `has not been`, `may not be`, `has yet to`, `cannot yet` and contractions, as well as existing dangling connectors/separators. Sentence punctuation and closing quotes do not turn an absent predicate into a complete constraint. Inspection normalizes only a temporary comparison string and never changes accepted content.

Complete predicates, uppercase codes, common `as is` forms and bounded indirect review phrases remain accepted. Reaching a schema limit without a final full stop remains valid. This is a bounded syntactic safeguard, not a semantic guarantee for arbitrary English or a proof that every model response is complete. Ambiguous bare auxiliary endings are rejected for explicit review/retry rather than completed by inference.

Generation guidance now asks for short, complete limitation sentences, preferably below 160 characters, preserving applicable constraints and uncertainty rather than starting another clause that cannot be finished. The existing maxima, output token cap, model, input/evidence boundary, schema shape and saved-data contracts are unchanged. The client repeats the same fresh check before committing; if provider metadata is unavailable its diagnostic reports unknown status/tokens rather than inventing them. No automatic retry or model repair call is added.

Existing cached proposals, edited drafts and immutable attachments retain their original text. A rejected replacement keeps all prior work. No legacy warning is removed or silently repaired.

## Evidence freshness

The hosted source snapshots establish a real change: S1/S2/T3/T4 changed from timeout to loaded, increasing availability from 13/18 to 17/18; D1 remained unavailable. Goal and planning inputs were unchanged. The existing evidence/source-availability guard is correct and is untouched. Its stale-proposal message directs explicit preparation and the existing **Prepare Action Plans** button is available; no additional control is introduced.


## Verification

All 1,321 unit tests pass. The new matrix checks 39 auxiliary/negation endings across five prose fields and three punctuation forms (585 rejection cases), alongside complete negative predicates, codes, indirect review forms and existing maximum-boundary text. The exact Plan2 suffix rejects the whole fresh proposal without mutating it. Client-commit tests confirm the shared gate and preservation of legacy cache reads. An end-to-end data test proves complete constraints survive wire normalization, preparation, starting estimates, draft validation, calculation, attachment, JSON reload and display byte for byte.

Production build, lint, standalone TypeScript and whitespace checks pass. The 177 production-browser checks cover incomplete-response recovery63, exact natural/prefixed editing63 and context staleness51 at desktop1366px, mobile390px and 200%-equivalent683px reflow. Recovery displays complete budget/timing uncertainty, rejects the unfinished second-plan limitation, preserves prior work and requires explicit retry. Existing numeric edits, Apply, calculation, attachment, reload and goal return remain covered. API traffic is intercepted; no live model or credential requests were made. Held eNPS files are unchanged. All merges remain held for hosted acceptance of the exact preview.
