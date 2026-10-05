# Phone workspace layout

This fix follows the user's screenshot findings relayed after actual pixel inspection: a permanent icon rail consumed phone width, goal/filter controls ran off the right, the header consumed much of the screen and composer guidance squeezed beside Send. Local Library materialization failed (`library file transfer failed: download failed`); the screenshot itself was not inspected in this executor. The current production tree `ed5ec25d964a16876c9f0c4a92c91553f4ebc93e` independently reproduced a severe layout problem: at320×640 the header was368px, chat width216px, and the fixed composer covered the entire reading area despite zero document horizontal overflow.

## Bounded changes

- Below768px, or phone landscape up to950px wide and500px high, navigation becomes a native dismissible popover drawer with full labels. The workspace uses the full width. Escape returns focus; choosing a destination closes the drawer. Desktop navigation remains unchanged.
- The goal selector occupies a full row with compact goal actions below. Existing filters collapse into a Filters disclosure; expanded country, business-unit and level controls stack at full width with16px type and44px heights. Selection is retained while closed and during navigation.
- Contact metadata moves into About & contact on phones. The title and persona remain available. The header scrolls normally. No explanatory scope banner returns.
- Phone replies, plans and composer use document flow; the composer cannot cover their content. Guidance and Send stack. Reply positioning waits for the render and input resize to settle. Desktop retains its fixed composer and original sizing.
- Existing palette tokens, original-navy-teal rollback, filtering, evidence boundaries, all navigation destinations and saved state remain intact. No model-input, calculation, persistence, DB, authentication, security, permission, billing or held eNPS changes.

At320×640 the header is286px and chat width296px; the composer is below content rather than over it. This is not a claim that the whole page or every response fits one screen. The interface scrolls to expose complete content and controls.

## Validation

Final validation covers 1,196 unit tests; 402 browser checks: new phone workflow80, palette43, evidence scope48, compact layout57, unified attachment117, tradeoff prose21 and composer geometry36. Desktop and200% reflow regressions remain covered. Full lint, standalone TypeScript, production build, whitespace and public analysis-artifact verification pass. API traffic is intercepted synthetic fixtures; no live model calls.

The new workflow covers320×640,360×800,390×844,430×932 and844×390: no document sideways overflow; full-width workspace/goal; collapsed then stacked filters; drawer labels, Escape/focus return and dismissal; unchanged drafts/filters; visible unoccluded reply; plan Details; explicit Calculate/review/attachment; Send reachability; and draft preservation during rotation. VisualViewport height240 is simulated for keyboard checks; this does not establish behavior on physical iOS/Android keyboards. Hosted phone acceptance remains required before release.

Existing tests now explicitly open the phone filter/nav disclosures and distinguish normal-flow phone composition from desktop docking; their original scope, data, palette and content assertions remain. Visual review also caught desktop filter stacking from native disclosure wrappers; those wrappers now render only on phones, and a new desktop filter-row/header-height assertion protects the original layout. An early 320px reply-position assertion caught a layout-settling shift and prompted the double-frame positioning correction. One intermediate regression run crossed a rebuild; final browser evidence comes from the stable final build on port3191.

Logs: `/tmp/phone-final-{unit,lint,tsc}.log`, `/tmp/phone-build.log`, `/tmp/phone-final-regression-browser-summary.json`, `/tmp/phone-composer-final.log`. Baseline/revised geometry captures: `/tmp/mobile-baseline-{320,390,430,844}.png`, `/tmp/mobile-after-{320,390,430,844}.png`; workflow screenshots `/tmp/phone-workspace-{320,360,390,430,844}.png` and `/tmp/phone-reply-{320,360,390,430,844}.png`.
