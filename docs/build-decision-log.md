# Build and decision log

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

### Pending presentation decision

**Proposal, not a confirmed design:** a dedicated “Guide & Data” page linked from the overall overview would keep the conversation focused. A large toolbar has not been implemented. Review the [content draft](guide-and-data-draft.md) before choosing its final placement.

### Known boundaries

- Data is synthetic; observed aggregates, stored models, user assumptions and AI interpretation are distinct.
- Planning source refresh date is not supplied by the current baseline response. Model-period dates are not refresh dates.
- Current aggregate sources do not establish individual suitability, availability, willingness, future readiness, hiring costs or future hiring timing.
- Generated wording is tested through bounded scenarios, not guaranteed for every future question. Review the source evidence for consequential interpretations.
- The older configured local role-plan server previously returned a repeatable `fetch failed` while unchanged production logic succeeded. Its underlying local-environment cause remains unresolved; this did not reproduce on the verified production flow or the overview's source endpoints.

