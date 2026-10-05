# Home: Getting started and Pinned Goals

Home places the approved purpose text above Questions to explore. Instructions default to collapsed and use a keyboard-accessible Show instructions / Hide instructions toggle. The four steps include tailoring a plan; Track results remains Coming soon. The secondary context tip beside the input is guidance only: it adds no URL fetching or model inputs. Guide & Data navigation and its page are retired. Essential demo, source-provenance and interpretation limits remain in Data details.

The existing right column lists browser-saved goals. Names come from the exact saved statements; two-line visual clamping does not alter their accessible names or stored text. The rail indicates Plan saved, No plan yet, or Saved plan needs review. These are navigation indicators, not assertions that a plan matches current evidence. The existing plan panel still performs its full source, goal and planning-context checks.

Selecting a goal uses the existing conversation selector, restores its own chat draft, cancels pending work and focuses its Action Plans panel. It does not constitute a new Pin event or request another response. No new persistent field is introduced. Plan creation remains an explicit Create Action Plan click through the existing bounded preparation request. A valid empty preparation permits another explicit attempt; it never retries by itself.

Reopening prefers an active attached option, then a saved option, within the exact goal/evidence/planning binding. Existing in-tab working drafts remain in their context cache. Saved inputs, including unknown values, are restored exactly; fresh illustrative defaults apply only to new drafts. Matching saved calculations and attachment snapshots can be restored without creating new calculation or attachment records. Prior versions remain intact. Records whose proposal cannot be verified stay available as reference summaries and cannot bypass current-context guards to enable tailoring.

Validation uses synthetic fixtures, not live model calls:

- `node --test tests/home-pinned-goals.test.mjs` checks goal isolation, saved/empty/unverifiable status, attached-option selection, immutable version history, exact restored values and stale calculation retention.
- `tests/browser/home-pinned-goals.mjs` exercises the production Home shell at desktop, mobile and 200% reflow sizes. It checks disclosure keyboard behavior, moved content, context tip, Data details, explicit creation, saved and unsaved draft restoration, focus, late-response cancellation, duplicate creation and stale evidence.
- Existing Home finding, combined-bundle, docked-composer and Action Plan application browser suites cover adjacent behavior.

Hosted application-flow and mobile acceptance require separate verification; local fixtures do not establish hosted coverage.
