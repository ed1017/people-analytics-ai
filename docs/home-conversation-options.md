# Home conversation to workforce options

Base: production `4023563005261af2c4aa74208bf022945960f2e5` (PR103).

Home assistant bodies, including the focused takeaway and retained conversation, use 14px text with 21px leading, 6px paragraph spacing, 2px between list items, and 8px/4px heading margins; additive blank-line spacer elements are omitted. Answer content, source links and uncertainty are retained. Other pages retain their typography. Planning actions use 14px labels; the prose action-plan request is secondary. Responses may still require scrolling.

After an ordinary question or draft, **Compare workforce options** opens an explicit local scope review. The user reviews the exact goal and confirms additional role capacity in one business unit. Retention-only, replacement-only and uncertain scope cannot create a workforce solution. Goal examples are labeled as examples, not evidence-derived priorities.

Confirmation retains the transcript and unfinished chat draft, saves the confirmed goal, and opens the existing planner below chat. Long goals are reviewed rather than silently truncated. Existing plans are resumed without replacing their inputs or drafts. Missing-input controls focus the relevant field. **Save reviewed inputs** and **Calculate options** remain separate explicit actions, using the existing payload and calculator. A successful calculation focuses its resulting cards. Context changes invalidate an open scope review; switching away and back does not revive a stale confirmation. The handoff pauses the automatic Home takeaway so it does not implicitly request AI.

PR103 option toggles, actual-number summaries, Details, direct comparison/tailoring/search controls, and the staged Compare/Adjust/Explore composer remain intact. Retention scenario modeling is outside this change.

After an answer, the main conversation shows the complete current turn, with prior complete turns available in Data details → Conversation history. The contextual workforce-options action follows the answer. Questions to explore and examples move into a collapsed **More questions** disclosure below the composer; the empty-state guide remains visible. The composer preserves its full placeholder and auto-grows from 80px to 320px. Long answers remain intact in a keyboard-scrollable region; no warnings, links, or paragraphs are truncated or folded.

## Validation

All browser APIs are intercepted with synthetic fixtures; no live OpenAI requests are made. The built-app tests run against `npm run start -- --hostname 127.0.0.1 --port 3100` after a production build.

- `node --test tests/*.test.mjs`: 502 tests.
- `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- `tests/browser/home-capacity-flow.mjs`: 84 assertions through the real Home components.
- `HOME_BUILT=1 ... tests/browser/home-capacity-flow.mjs`: 72 assertions through the built Next app, from ordinary chat to scope review, input save, calculation and comparison.
- New-flow viewports: 1366px desktop, 390px mobile, and 683 CSS pixels at 2x device scale (the reflow equivalent of 200% zoom in a 1366px-wide desktop window). Computed body font/leading/spacing, retained text and source links, focus, and horizontal overflow are checked. This is emulated reflow, not a claim of manual physical-device testing.
- Existing browser regressions: option composer (56), solution cards (128), journey guidance (62), input readiness (48), request cleanup (38), built-app cleanup (12), goal statement copy (44), local search (64), and built-app pin selection races (32).
- Older regression interactions were updated for collapsed disclosures and the Home Calculate label. The original readiness and pending-cleanup disclosure failures were reproduced on the unchanged production base before updating selectors.

To run browser scripts without adding dependencies to this repository, set `PLAYWRIGHT_MODULE` to an installed Playwright `index.mjs`. Scripts use `/usr/bin/chromium`; some also accept `CHROMIUM_PATH`.

No database, authentication, permissions, billing, domain, security, model-input boundaries or eNPS activation changes. The held eNPS SQL and contract files are untouched. No GitHub status API routes are used. This branch is for draft review; it is not merged or released.

## Compact Home follow-up validation

The compact follow-up passed 502 unit tests, ESLint, standalone TypeScript and a production build. Browser reruns passed 457 assertions: compact full-shell layout (59), built Home discovery-to-options (72), component Home flow (84), option composer (56), contextual prompts (44), built pending cleanup (12), pin-selection races (32), and cross-page solution review (98). The other regressions above passed on the preceding PR104 checkpoint. Browser network calls were intercepted; no live model calls were made.

`tests/browser/home-compact-layout.mjs` uses full-shell synthetic short (69-word), standard (96-word), and long (18-bullet) answers. It checks retained caveats/source links, current-turn/history access, keyboard scrolling to the final warning, disclosure order, draft preservation, Send boundaries, composer auto-growth and typography. Full-shell measurements:

| Viewport | Short answer: action bottom | Standard answer: action bottom | Scrolling |
| --- | ---: | ---: | --- |
| Desktop 1366×900 | 610px | 673px | Both answers/actions fit initially; further page content requires scrolling. |
| Mobile 390×900 | 864px | 948px | Short answer/action fit; standard action requires page scrolling. |
| 200% equivalent 683×450, DPR 2 | 742px | 794px | Both require page scrolling; standard answer also exceeds the 315px chat region. |

No horizontal overflow occurred. The unchanged app header consumes 258px in mobile and zoom reflow. This is measured emulation in Linux Chromium, not physical-device or native browser zoom certification, and does not promise every response fits one screen. The mobile composer placeholder was visually checked and remains fully visible. Local screenshots and metrics for this run are in `/tmp/home-compact-shell-ZAKszG/`.
