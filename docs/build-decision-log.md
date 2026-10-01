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

### PR72 published and verified

- Head f1dc12f67386cb80f91017c950efce960104003f, PR72, merge 76632e6c85c63aee5ba6ab3124478318e04eacac. Configured Vercel check and Preview Comments check succeeded; production deployment succeeded 2026-10-01T17:45:25Z.
- Public production replay: all 39 guide/layout/filter/Planning state checks passed. UI test chat was intentionally mocked; prior configured local real AI checks are separately identified above. User was told this stage is live and can be refreshed.

### A+Teal / company wording / Compensation / model attribution stage

- Branch feature/company-theme-and-guidance from PR72 merge. app/globals.css now uses approved navy #0B1426, primary #A5C5EE, teal active-navigation accent #45D6B0 and off-white text; prior palette remains in version history. Chart axes follow theme contrast; semantic chart colors remain distinct. Sidebar row/group spacing tightened further.
- User-facing strings in app/components/lib now say company instead of enterprise. TypeScript AST literal/JSX changes preserve internal identifiers, schema keys and literal scope value `enterprise`. Existing copy-sensitive test expectations were updated without changing data assertions.
- Compensation is a navigation placeholder with TBD and an unavailable explanation. No data endpoint or AI panel is exposed for it.
- lib/chat-model.ts holds gpt-5.6-luna, the actual existing model used by both response paths. The unchanged Ask People Analytics AI heading now has a small readable Powered by label using that same constant.
- Validation: node --test --test-reporter=dot tests/*.test.mjs (63 pass), TypeScript and full Webpack placeholder-config build pass. 41 isolated candidate browser checks pass, including all destinations fitting 1366x768/1920x1080, mobile containment, Compensation/model label and preserved Planning inputs/comparison. Text contrast ratios: body 16.82, muted card 9.08, primary button 10.35, active teal 6.59; input border vs background 3.25.
- Guide copy review boundary arrived after PR72 merge. The new first-person provenance rewrite was shown for review; current Guide source is byte-identical to PR72 and excluded from this follow-on. Its old enterprise terminology is intentionally held pending user approval. Requested orbit:writing-style was unavailable in local and cloud skill catalogs; plain first-person style used instead.
- Source review confirms stored O*NET mapping counts, not a verified live O*NET API/import version. Live public BLS endpoint returned August 2026 observations on October 1. Skills/Learning as-of dates are application constants, not verified refresh timestamps. Survey favorability threshold and external questionnaire provenance remain unverified. No schema/access/credential changes.
- Still queued: shared Country/Business Unit/Level row plus Reset and page-grounded automatic summaries with bounded cache/retries; supported aggregate CSV export. The request for a headcount list of names remains a separate roster/access assessment, not fulfilled by aggregates and not authorization to expand public data access. Guide rewrite waits for explicit copy approval.

### Explicit Planning navigation reversal / exact release timeline

- After seeing PR72 live, the user explicitly requested removal of the duplicate full-width controls and five shorter cards stretched equally across available desktop width. This supersedes the earlier keep-both instruction. The next stage retains the same five canonical destinations and handler, with a responsive two-column small-screen fallback and no duplicate strip.
- Exact PR72 merge timestamp: 17:44:52 UTC; deployment success: 17:45:25 UTC. The reported Guide review request was at 17:45 UTC, after merge but before deployment success. The hold reached this executor after merge. All further Guide copy changes are held, not only the provenance rewrite. No guide rollback/deletion performed.
- Latest free disk: 14,401,040,384 bytes (13.41GiB). No cleanup performed.

### Reviewed Guide edits, approved separately

- User reviewed the live Guide and said they liked it, then explicitly requested removal of Recent changes. Removed that public section only; this execution history remains intact.
- User changed roadmap heading to "What's coming next" and V2 to "Compensation and location-based scenario modeling." This supersedes the earlier machine-learning/predictive proposal. It is future copy only, not implementation or a release-date commitment. V3 remains undefined.
- The unseen provenance expansion remains held for review. Its exact proposed text was provided in commentary; it is not in the application or this release.

- Final explicit roadmap correction: V3 is "Role-based user access and security, with chat agents tailored to each user or role"; V4 is "Machine learning and predictive analytics." These replace undefined V3 and the former V2 ML direction. Copy only; no auth/security/agent/ML implementation or dates authorized by this wording.

### Final UI-stage release gate

- After the explicit Planning reversal and exact approved roadmap changes, full Webpack build passed again. Final isolated browser replay passed 42 checks: no duplicate strip; all five shorter equal-width cards share a desktop row at 1920 and 1366, small-screen fallback contains width; scenario input, handoff and Talent comparison persist; exact V2/V3/V4 copy and removal of public Recent changes pass.
- Targeted ESLint: zero errors, one pre-existing aria-description/separator warning in AiPanel. Earlier 63 repository tests and TypeScript pass; no application changes after final build except this log.
- Latest approved Guide readability polish (two-column desktop cards, one-sentence Planning explanation, plain source names) is queued for the next bounded stage after this frozen UI release. W1/T1/P1 are application briefing source references created in lib/overview-briefing.ts, not database storage codes.

### PR73 live; current scoped-guidance implementation

- PR73 head e5fc83af61f5c3b4914df6d3943281170e205ee8 merged at 18:02:27 UTC as a5c611516a70d328cdd4d539482aa4b8b5763866. Production succeeded 18:03:00 UTC; all 42 public UI checks passed. Latest free disk 14,453,178,368 bytes (13.46GiB).
- New branch feature/scoped-page-guidance. Public Home byline/contact explicitly approved: by Ed Om, edwinom.nyc@gmail.com, mailto link. No heading rename was selected.
- User explicitly revoked the Guide review hold and authorized publication of the verified source copy. Current local Guide is first-person, with verified BLS live API vs stored O*NET mapping distinction, synthetic Survey measures and unverified favorable threshold/provider, explicit fixed Skills/Learning dates and source-history gaps. Purpose/Ed credit and roadmap are left; Start with a question is right on desktop, stacked on mobile. From evidence to Planning uses the exact one-sentence request; a separate five-step how-to preserves useful directions.
- Shared Country / Business Unit / Level filters and Reset moved beneath Perspective on every page. Selected Workforce snapshot and Home W1 follow these filters. Other aggregates remain company-wide and Planning retains scenario/carried-evidence scope. No unsupported query filters or schema/access expansion.
- Manual chat and automatic destination briefing now share a single existing governed evidence payload. Briefing uses current destination, filters, data, scenario, compared goal and source date; server forces no tools. Planning Overview gives the real five-destination how-to. Briefings debounce 650ms, serialize requests, cache 32 contexts for five minutes, retain failures without auto-retry and support explicit retry; stale responses cannot replace the active destination. Home uses a separate bounded 16-context cache. Follow-up chips are between conversation and composer.
- CSV export implemented locally for Workforce snapshot/full trend/company breakdowns and Skills summary/visible skill tables only, from already loaded data. Explicit field allowlists, source/scope/filter/date/unit metadata, zero vs unavailable preservation and CSV formula escaping. Other pages clearly say unsupported, with no invented link. Employee-name/roster requests explicitly say not exported. Headcount endpoint returns a count only; no row access was added.
- Quick read-only HR assessment: Perspective is client state accepted for response wording, not authenticated authorization. Existing server data client is server-only; this checkout has no matching auth/middleware route files. Career source contract contains movement dates/types and old/new level/position identifiers internally, but no names in its public aggregate response and missing origin positions. Live grants/RLS were not inspected or changed. User explicitly deferred person-level HR detail to V3; current demo remains aggregate-only. No deeper security design or implementation blocks this release.
- New cache/export unit tests plus existing suite pass (69 total); TypeScript and targeted new-file lint pass at the local checkpoint. Full build and browser/real-AI validation pending.

- Added the explicitly requested compact Home right-hand how-to card (Workforce, Talent, explicit Skills carry, Planning comparison), with canonical navigation only and mobile stacking. Home remains majority conversation space. No automatic carry or model action.

- User explicitly confirmed the compact heading Ask AI after the earlier ambiguity; changed only the visible heading and shortened Left/Right controls, preserving accessible move labels and model subtitle. Added separate Tools I used Guide card (VS Code per established project context, GitHub, Vercel, Supabase, Next.js, OpenAI), distinct from external source provenance.

- Current-phase refinement: smaller shared filter boxes (28px desktop / 36px mobile select height, reduced padding/width, full selected-value title and native keyboard controls). Header height is measured to keep sidebar/AI offsets correct. Home how-to now explicitly frames Workforce as identifying the problem, Talent as identifying potential, and Planning as developing/comparing the plan; explicit Skills carry and no real workforce changes remain clear.

- Local runtime checkpoint: 37 scoped UI checks pass (real governed GETs, mocked chat for state/layout), including actual CSV browser downloads and explicit roster refusal. Seven additional injected-error/stale-response/panel checks pass. Real Home and filtered Workforce automatic AI returned 200; a subsequent harness selector, not the app, stalled the remaining real Planning/Skills check and is being corrected. Per-page casual tooltip request is queued as a separate follow-up commit after this stage.

### Scoped-guidance final release validation

- 70 repository tests pass after adding cache serialization/deduplication/expiration/cancellation tests and CSV allowlist/null/zero/formula tests. Full Webpack placeholder-config build and TypeScript pass; targeted new-file lint passes.
- Final configured candidate: 37 scoped UI checks pass, including 1920/1366/768/390 width, desktop no-scroll navigation with global filters, Home credit/contact/how-to, Guide provenance and two-column arrangement, shared filter/reset, cached summaries, actual CSV downloads, roster refusal and preserved Planning input. Chat mocked only for these deterministic state/layout checks.
- Seven separate injected-response checks pass for explicit retry, no automatic retry loop, stale-response isolation, compact Left/Right persistence and mobile panel width. All 15 analytics/Planning destinations load real existing GET evidence and reach the briefing state in the route-mocked matrix.
- Four real AI responses returned 200: Home source-cited briefing; Workforce Australia 300 versus company 10,000; Planning Overview actual five-step how-to; Skills company-wide 10,000 despite selected Australia. No automatic model/tool actions. Queued summaries for superseded destinations are skipped before calling the model; failures wait for explicit retry.
- Prior real-check harness stall was a selector looking for paragraph nodes in rendered chat content; removing that incorrect wait allowed the full real check to complete. No application fallback or fixture was used in real AI checks.
- Scope limits remain explicit: CSV supports Workforce and Skills aggregate tables only, not Home/other modules/scenarios or employee rosters. HR person-level access remains future V3. Protected preview runtime is not claimed; validation is exact configured local candidate plus post-release public checks.

### PR74 released; bounded page help follow-up

- Explicit later user release instructions superseded the original diagnostic-only scope. An initial push was rejected by automatic approval review; after parent supplied verbatim authorization, the same push was retried once and approved. No alternate publication route was used.
- PR74 head bbccc84f5daa2c627a9fdcdf2c5ac0364ad5b6d5 merged as ccb6af251e6bf3ae63c4cc1ab37d8b6cc4b827e8. Configured Vercel build succeeded; Production deployment succeeded 2026-10-01T19:03:16Z. Public production verification passed 37 UI checks, 15 real-source destination checks (chat mocked), and four real AI responses: Home, filtered Workforce, Planning Overview, company-wide Skills. These are production checks, not protected-preview runtime checks.
- Separate branch feature/page-help-and-home-guide adds first-person help beside the canonical header title for all 18 destinations, plus legacy aliases. Exact maintained copy is in lib/page-help.ts. Hover, keyboard focus/activation and touch open help; Escape/outside interaction dismiss it; destination changes reset it. Tooltip stays hoverable and inside the viewport. No model/data/auth changes.
- Home right-hand guide now explains decision-making with measurable goals, modeled financial costs and tradeoffs, then gives Workforce -> Talent -> Planning clicks. Carry instructions use actual Observed skill gap, Business goal and Carry to Planning controls; no automatic execution is claimed.
- Final follow-up TypeScript, full placeholder-config Webpack build, targeted ESLint and diff whitespace check pass. All 52 isolated browser checks pass across 18 destinations, hover/focus/Escape/outside dismissal, touch at 1920/1366/768/390, desktop navigation fit, three guide navigation links and actual carry-control labels. Chat mocked for these UI checks; existing governed GETs were used.
- Initial follow-up test encountered our stale candidate server PID21272 on3094; only that verified agent-owned process was restarted. Candidate now PID16232. Additional harness failures were a viewport measurement before resize settled and an exact dropdown-label selector; corrected harness completed successfully without code changes.
- Normal Chrome/user windows and unrelated servers were untouched. Latest free disk 13,517,127,680 bytes (~12.59GiB); no cleanup or dependency copies. Target deadline October1 20:00UTC remains feasible. Person-level HR access stays future V3, and exports remain only supported Workforce/Skills aggregates.
- Follow-up regression replay: all 37 prior scoped UI/filter/CSV/Planning checks also pass on the final candidate.

### Final Home / Guide / AI-toggle polish

- Verified latest main3c454bd479f13b361fa9c6ad7b87920ad13beb4b and clean tracked worktree before creating feature/final-guide-polish. Old PR65 worktrees preserved.
- Home right guide widened250px to300px on desktop. Exact user purpose and first-step copy applied; merged Talent and explicit Skills carry into one step with Skills Intelligence and Learning & Development navigation. Added larger See Guide & Data for more details button. Navigation still does not carry evidence or run models.
- Guide retains exactly eight requested sections. Purpose/roadmap left; Start with a question and Planning how-to right. Other module cards removed, app destinations preserved. Necessary fixed-date, synthetic-source, survey, O*NET and modeling limitations consolidated into retained cards. V2 adds future eNPS; V3/V4 unchanged. No data/analytics extension.
- AI Left/Right controls now28px high with explicit visible keyboard focus, labels, pressed state and existing behavior preserved.
- Final TypeScript and full placeholder-config Webpack build pass. Targeted lint:0 errors,1 pre-existing separator warning. All22 focused isolated browser checks pass: exact text, three steps,300px guide, eight Guide sections, column arrangement, roadmap/source limits,390/768 mobile containment, draft/navigation persistence, keyboard side switching and all16 grouped app destinations.
- First focused test caught missing source-limit paragraphs after card removal; restored them and rebuilt/retested successfully before publication. Candidate server5324 on3094 only; no user-window or unrelated process control.

### Guide source grouping and Home right-edge width

- New branch feature/guide-source-placement from verified main71975d504c2801633e327186857180bb66d5cb76. User approved prior copy and requested layout-only follow-up; later correction explicitly orders Tools I used -> External labor market context -> Skills Intelligence and O*NET. Group now sits beneath purpose/roadmap in left column; Start, Planning how-to and evidence bridge remain right. All8 approved card texts and source links compare identical to PR76 production. Mobile follows the same DOM/visual stacked order without CSS reordering.
- Additional user request included: remove Home max-width cap and widen desktop how-to300px to340px, preserving exact approved copy. At1920px right margin226->32px, guide300->340px, AI896->1244px. At1366px right margin remains32px, guide300->340px, AI730->690px. AI remains larger. Mobile widths unchanged, with no horizontal overflow.
- Final TypeScript, full placeholder-config Webpack build, targeted lint and16 focused isolated browser checks pass. Checks compare all8 approved cards/links, source-group ordering, Planning right column,1920/1366/768/390 Home geometry, mobile Guide DOM/visual order and Back navigation. Chat mocked for UI checks; real governed GETs used. No data/model/security changes. Candidate server15156:3094; unrelated servers/user windows untouched.
