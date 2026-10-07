# Home integration acceptance — 6 October 2026

This checklist covers the combined candidate. Source-branch checks do not replace
final combined checks or hosted acceptance. No merge or production publication is
authorized by this document.

## Source gates

- Base: `e4ca8e8941b7f9970d0a0bfb17818836b5cbc2ab`.
- PR165, chart presentation: `aa9eeb142f5c43e26e2ec639a4026fe6ca74a7ce`;
  parent reports independent hosted acceptance. Integrated with ancestry retained.
- PR167, answers/starters/citations/turnover focus/evidence chart:
  `7bc023ece6b3b8920caf8b3c1fb297cee2d79bb2`; integrated with ancestry retained.
- PR166, guide/demo plans: `fbc03f2c4c71d9a5004845691a2753fa04a64665`;
  corrected source integrated with ancestry retained; parent reports focused hosted acceptance.
- PR168, context-aware plan revisions:
  `c2cac7f2a0ebb3e47c7d3e9e2afcc6f504082264`; source checks reported by parent,
  integrated with ancestry retained. Combined hosted acceptance remains pending.
- Preserve all source branches. Record each accepted head before final checks.

## Combined acceptance

- [ ] **Ordinary answers:** April why-question, year clarification, March follow-up
  and general workforce question produce direct grounded answers without forced
  goals. Rates, counts, periods, selected scope, missing denominators and causal
  uncertainty remain distinct. Computed April comparisons say 0.93% is below
  0.96% and 1.05%, with the correct percentage-point deltas.
- [ ] **Answer presentation:** short takeaway, brief semantic bullets and nested
  categorical sub-bullets; small superscript source IDs retain targets, contrast,
  accessible names and keyboard focus. Ordinary bracketed data stays unchanged.
  Explicit Action Plans retain their required structure.
- [ ] **Starters and guide:** the seven approved prompts form three compact
  groups, using available container width. Exact skills/training wording and
  unambiguous forecast intents survive integration. Initial General exploration
  remains available with two seeded demo goals; active guide steps suppress
  competing starters. Draft protection and the existing `submitQuestion` path
  remain intact.
- [ ] **Instructions and scroll:** expanded disclosure says “Hide instructions”;
  its compact reopen control works. Another question, starter selection or
  submission collapses it once without hiding the current response, goal card,
  revised plan or composer beneath a sticky header/dock.
- [ ] **Broad turnover goal:** goal and primary Pin precede optional findings.
  “Pin overall turnover goal” means all turnover types within the current scope;
  scoped explicit goals retain accurate wording and filters. Overall context
  uses total measures, not voluntary/regrettable counts as substitutes. Numeric
  voluntary-only focus requires matching evidence and explicit selection. No
  unsupported group rate, denominator, ranking or job/level cut is invented.
- [ ] **S2 evidence chart:** a matching answer can show validated existing
  exit-survey reason counts/percentages on a compact zero-based bar chart.
  Denominator, company scope, as-of date, unavailable fieldwork period and
  association/causality limits stay visible. A1 administrative reasons and S1
  favorability remain separate. Invalid/suppressed/incomparable inputs omit the
  chart; snapshots stay bound to their originating reply and reset correctly.
  Force an initial S2 timeout, Refresh, then ask for exit-survey reasons with the
  earlier unavailable reply still in history. Current primary-reason rows must
  drive both prose and chart; exit-experience question rows must not displace
  those counts. A stale unavailable claim or numeric mismatch omits the chart.
- [ ] **Forecast charts:** all three domains retain source values, dates, units,
  missing periods, method identities and projection boundaries. Readable dates,
  disclosed cropped axes and keyboard tooltips work at wide, 390px, 320px and
  reflow widths in the supported palettes. S2 count charts still start at zero.
- [ ] **Demo plans:** two examples use normal plan contracts, start without
  selecting a goal, preserve existing saved work and use consistent current and
  historical cash/time assumptions. A fictional example does not block a user
  from explicitly pinning their own same-named goal; the example stays unchanged
  and existing user-goal duplicates stay blocked. Short plan labels, guide visibility and
  shared loading state do not trigger duplicate preparation requests.
- [ ] **Plan revision:** a budget edit inherits the exact active plan/goal and
  constraints, recalculates through the existing contract, and displays its
  revised plan below the reply with current Compare/Attach actions. Prior
  attachments remain unchanged; stale/late replies cannot target another goal,
  scope, plan or reset session. No duplicate model call or plan state machine.
- [ ] **Shared boundaries:** reconcile Home imports/state, guide visibility,
  `submitQuestion`, candidate ordering and `renderMessageSupplement`. Preserve
  forecast and S2 supplements when adding revised plans. Check selected-plan
  context, demo loading, navigation, goal switching, attachment/reload and Reset.
- [ ] **Final gate:** clean application-only diff; all recursive test/spec files,
  lint, TypeScript/build and relevant production-browser suites pass at the exact
  combined tree. Complete independent hosted acceptance at the exact candidate
  head, including live-model wording. Record head/tree/checks and blockers;
  parent coordinates the single publication. No private evidence or SQL added.

Browser fixtures validate wiring and presentation with synthetic data. Hosted
review must independently verify model behavior and the integrated user journey.
