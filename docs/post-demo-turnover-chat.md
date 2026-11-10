# Post-demo turnover conversation isolation

## Defect

After a guided staffing plan was saved, the suggested business-unit turnover question failed before any provider call with `Exact public evidence for this saved plan is unavailable. Earlier plans are kept.` Resetting conversation removed the blocking catalog.

The guided plan correctly retains an empty workforce evidence packet and its fictional scenario inputs. The public conversation envelope previously required every saved/working plan binding to match a public evidence recipe even for an unrelated workforce question. The fix does not change or rebind those saved assumptions.

## Change

Recognized business-unit turnover questions use a transient evidence-only request with fresh public evidence, no selected plan/catalog, and no planning state. Original workspace identity, selected plan and catalog remain the in-flight currentness guards. On success, only verified conversation turns are merged back; current calculation visibility is cleared. Saved working proposals, constraints, analyses, focus, recommendation provenance and stored evidence recipes are preserved. Unexpected planning outputs are rejected.

This is deliberately narrow: mixed questions that also change a plan, actual plan follow-ups, unrecognized questions, and active scenario discussions retain the existing strict provenance gate. It does not resolve every independent question after saving, nor add level/tenure/cost breakdown support.

## Verification

The new regression uses the actual unmodified `createSwpDemo` binding, reproduces the original failure, and checks the successful isolated request. Actual `converseSolutions` execution prohibits provider and projection calls. Coverage includes repeat questions, follow-ups, mixed requests, unavailable evidence, selected-plan preservation, unexpected state rejection, and nonempty working-proposal/constraint provenance preservation. Existing BU turnover and public evidence recovery tests are run alongside it. No paid provider calls, data-source edits or production deployment are included.
