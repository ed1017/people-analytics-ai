# Build and decision log

Standing user instruction: record every meaningful app request, correction, implementation/test milestone and release here. Separate confirmed intent from proposals and local work from live verification. Include exact commits, PRs, test outcomes and next steps when known; never record credentials or private notes.

## 2026-10-01 — Talent evidence, AI context and overall overview

### Confirmed requirements

- Add an overall, chat-first overview above the existing Workforce, Talent and Planning navigation groups. Preserve the existing subsection overview pages.
- Make the main canvas predominantly conversational, with a short generated findings summary and guided questions: “Where should I focus?”, “Tell me something interesting”, and problem-solving follow-ups.
- Use the existing slate appearance, large readable text and a resizable composer. Use live aggregate evidence rather than static worked examples or a wall of dashboard cards.
- Keep source dates, populations, denominators and scope traceable. Do not invent data, rankings, unsupported comparisons, costs or timing. Do not add autonomous workforce actions, database/security changes or an arbitrary custom-chart builder in this slice.
- Add written user instructions and more detail about the data. The user's latest description proposed “a giant toolbar or ... another page” for this information. The information need is confirmed; its presentation is not yet decided.
- Keep a written project build/decision log.

### Released

| Change | Production merge SHA | Validation and outcome |
| --- | --- | --- |
| [PR68 — Talent evidence comparison](https://github.com/ed1017/people-analytics-ai/pull/68) | `0db8b2dbec74aeab1d3ecac0f514688eb6e43060` | Configured Vercel build passed; 15 live browser checks passed, including real role-plan retrieval. |
| [PR69 — Comparison AI grounding](https://github.com/ed1017/people-analytics-ai/pull/69) | `42daf8e578570f53bcd9e7229ffff2ceb9dbdf69` | Snapshot plumbing passed, but multi-turn live answers could still reuse obsolete conversation context. |
| [PR70 — Inactive-page prompt](https://github.com/ed1017/people-analytics-ai/pull/70) | `285f0706948ef372c9ad163547f4323daf7d04b9` | Standalone replay passed; the longer live conversation still reproduced stale answers. Prompt wording alone was insufficient. |
| [PR71 — Model-history isolation](https://github.com/ed1017/people-analytics-ai/pull/71) | `bf1e0775f02c91c06e0c7621b5d95ce5e3a336e4` | Configured Vercel deployment succeeded at 16:48:28 UTC. Two local multi-turn replays passed, then 25 production checks and six real AI turns passed. Same-context history is retained; obsolete context is excluded without deleting the visible transcript. |

Production remains at PR71: https://ed-workforce-ai.vercel.app . Protected preview runtime was not independently accessible; Vercel authentication was not bypassed. Configured deployment success and direct production runtime checks are separate evidence.

### Local overall-overview candidate

- Branch: `feature/chat-first-overview`; application commit: `ae6ba02f61e9ec702c0413c834a24e2a8a380e8f`.
- Nine application/test files, +241/−12. Not pushed or deployed.
- Uses existing unfiltered Workforce overview, enterprise Skills Intelligence and the stored Planning Baseline. Each keeps its own date, population and limitations. Missing sources are explicitly unavailable, not zero.
- The initial generated briefing becomes context for follow-up questions. Overview conversation and drafts survive navigation. Refreshing evidence replaces model context while preserving visible messages.
- Home-page tool choice is disabled: this slice explains the supplied evidence and does not run models or workforce actions.
- Validation: 63 repository tests passed; final targeted source tests, TypeScript, ESLint and full Webpack build passed. Local build used non-secret placeholders; real runtime validation loaded the existing configuration in place without copying credential files.
- Browser validation: 17 flow checks plus 10 final targeted checks passed, including mobile width, source failures, navigation, keyboard access, draft preservation, real AI answers and unsupported-request handling. A final direct local UI → configured source endpoints → real AI check also passed without response fixtures or production proxies.
- One generated answer initially compared unequal historical/model horizons as “slower.” The final rule explicitly disallows that comparison; real AI replay rejected the unsupported conclusion.
- Local review endpoint: `http://127.0.0.1:3094` while the background preview is running. Source branches and existing servers were preserved.

### Guide and responsive layout — confirmed follow-up

The user confirmed the dedicated **Guide & Data** page, linked from the overview, twice. The page is implemented locally with purpose, usage, source coverage, dates, populations, limitations, explicit Planning interactions and a short factual changelog. No giant toolbar was added. The [guide content record](guide-and-data-draft.md) records its source material.

- V2 is a **proposed** machine-learning and predictive-analytics direction, with no date or implementation claim. V3 remains undefined; no features or dates are invented.
- The user requested desktop optimization at 1920×1080 and 1366×768, with navigation fitting without scrolling where feasible. Implementation uses width/height breakpoints, compact vertical spacing, a fixed navigation width and readable labels; short windows and mobile retain safe scrolling.
- The user specifically approved pushing the overview, Guide & Data and responsive polish, opening a PR and merging/deploying after checks pass: “Oh yeah, go ahead, do it.” Publication will follow local validation and configured release checks; this entry does not claim it has already occurred.
- Latest authoritative Planning correction: “keep-keep the tabs, but add the square also.” Five compact square cards are added above the existing destination tabs, using the same selected state and navigation handler. This replaces the earlier interpretation that tabs should be removed. No global journey toolbar is added.
- Dark-navy theme exploration is separate and unselected. The Slate Mist B theme remains unchanged.
- Theme exploration update (proposal only): the user likes a `#0B1426` base, wants concepts A and C retained, concept B dropped, and Teal/Amber comparisons added. Mockups are being prepared separately. There is no final theme selection; this does not authorize replacing the current Slate Mist theme or blocking the release.

### Guide/layout local checkpoint

- Implemented Guide & Data with keyboard focus on entry, a return link to the overview, verified data explanations, an actual short changelog, proposed V2 machine learning/predictive analytics, and V3 explicitly undefined.
- Added five 96px square Planning cards without removing the existing tabs. All use the existing shared destination handler; no new scenario state or data access was introduced.
- Desktop navigation density uses 768px width and 850px height breakpoints. Width is preserved; short-height/mobile scrolling remains available. Testing at 1920×1080, 1366×768, 1366×650 and 390×844 is in progress before publication.
- Guide/card TypeScript, targeted lint, full Webpack build and 11 focused history/overview/navigation tests passed. Browser fit and state-preservation checks are the next gate.

### Read-only disk checkpoint

- Free space measured 13.55GiB, then 13.51GiB during this work. Five `.next` directories totaled about 1.05GiB; shared dependencies 0.525GiB; test harness/artifacts about 19.8MiB. No dependency copies or cleanup were performed.
- Windows reports an automatically managed paging file allocated at 15.13GiB, with low current usage at the checkpoint. It is a plausible contributor to large changes, but no before/after measurement proves the cause of the reported swings.
- OneDrive is running; limited top-level metadata includes offline items. This does not establish hydration activity or attribute the disk changes to OneDrive. No private contents were opened and no OneDrive settings changed.
- Safe next diagnostic: compare free space and paging-file allocation at the next observed swing. Continue one build at a time while space remains adequate; do not delete unrelated data.

### Known boundaries

- Data is synthetic; observed aggregates, stored models, user assumptions and AI interpretation are distinct.
- Planning source refresh date is not supplied by the current baseline response. Model-period dates are not refresh dates.
- Current aggregate sources do not establish individual suitability, availability, willingness, future readiness, hiring costs or future hiring timing.
- Generated wording is tested through bounded scenarios, not guaranteed for every future question. Review the source evidence for consequential interpretations.
- The older configured local role-plan server previously returned a repeatable `fetch failed` while unchanged production logic succeeded. Its underlying local-environment cause remains unresolved; this did not reproduce on the verified production flow or the overview's source endpoints.

### Confirmed Home / Workforce consolidation

- User corrections: name the overall landing **Home**; remove the old Workforce Overview entry; name the consolidated destination **Workforce**. The Workforce group and Planning Overview remain unchanged.
- Preserved the old Overview country/business-unit/level filters, filtered headcount/FTE and trend, attrition, labor cost and open positions inside Workforce. Enterprise composition is explicitly unfiltered, in both the interface and AI context. Legacy `overview` navigation resolves to Workforce; Home source links use Workforce.
- Local implementation only at this checkpoint; final responsive, regression and release validation pending. Theme remains Slate Mist; new concepts remain proposals.

### Navigation release validation and newly authorized stages

- Final local navigation bundle: 63 repository tests, TypeScript, full Webpack placeholder-config build and targeted component/helper lint pass. Broader lint reports five pre-existing errors in app/page.tsx and app/api/chat/route.ts, confirmed present in production base bf1e0775; no new findings in changed component/helper files.
- 39 isolated headless browser checks pass: Guide content/focus/draft preservation; navigation fits 1920x1080 and 1366x768; safe 1366x650 scrolling and 390px width; retained Workforce filter operation; all five square Planning cards and existing tabs synchronize with sidebar; scenario input, carried evidence and Talent comparison persist.
- Real configured candidate Home briefing plus follow-up returned 200. A real Workforce answer distinguished selected Australia headcount 300 from unfiltered company composition 10,000. Existing configuration was loaded in place; no credential copying or normal browser use.
- Earlier harness retries corrected ambiguous accessible selectors and a hidden-option wait; these were test-harness failures. Final run passes.
- New explicit authorization: publish all agreed changes in bounded tested stages. First stage is this Home/Guide/navigation/Workforce bundle. Next: selected A+Teal theme (#0B1426 base, #A5C5EE primary, #45D6B0 secondary, off-white text) and user-facing enterprise-to-company wording. The former unselected-theme status is superseded; no chatbot heading was selected.
- Follow-on behavior: canonical Country / Business Unit / Level shared filters beneath Perspective with Reset; only supported aggregates filter, unsupported sources remain explicitly company-wide. Automatic destination summaries must use current page/filter/goal/evidence, bounded dedupe/cache, loading/error/retry states and follow-up chips between conversation and composer. No erase button. These follow-on changes are requested, not yet implemented or live at this checkpoint.
- GitHub main verified unchanged at bf1e0775f02c91c06e0c7621b5d95ce5e3a336e4 before publication.
