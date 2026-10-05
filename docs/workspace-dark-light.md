# Dark / Light workspace

Approved follow-up to PR137: two visible choices beside Perspective, Dark and Light. Light is the default for new visitors. Dark preserves the released Blue design; Original remains a source-only rollback preset, not a visible option.

Light applies to the main workspace canvas (#DEECFA), gray-blue cards and composer (#CEDCEB), filter strip (#D3DFEC) and dark foreground (#182B43). Muted text is #41566F. The title bar and navigation retain dark surfaces and their original foreground tokens. Custom Home, learning/development and evidence-table surfaces use the Light tokens too. Existing workflows, sizing and phone layout are unchanged.

Preferences keep the existing local-storage key `people-analytics-workspace-palette-v1`. Saved `slate-blue` remains Dark, saved `light` remains Light, and unrepresentable legacy `original-navy-teal` maps to Dark. Missing/invalid/unreadable preferences default to Light. A blocked write retains the explicit choice for the current tab. Changes synchronize across tabs. The internal Original CSS preset remains available by setting the main element's `data-workspace-palette` in source.

A small synchronous head initializer applies the saved theme attribute before paint. The server-rendered default and React server snapshot are Light; the existing external-store hook resolves saved choices after hydration without changing the prepaint colors. No external script, account preference, API, cookie or model request is introduced.

The approved Library reference resolved to version 2, but the supported download failed. Implementation follows the expressly approved text specification; exact image matching is not claimed. The ML disclosure work stays isolated on PR138.

Validation: all 1,196 unit tests, production build, TypeScript, ESLint and existing analysis-artifact verification pass. Browser checks total 519: 117 palette checks plus 402 Home, scope, attachment, tradeoff, phone and composer regressions. Palette coverage includes 1366px desktop, 320/390/430px phones, 844px landscape and 683px reflow; full canvas/card colors and contrast, retained dark chrome, drafts, disabled actions, keyboard arrows/Enter/Escape, reload persistence, legacy preference migration, blocked reads/writes, pre-hydration saved-theme rendering, no hydration/runtime errors and no live model requests. Physical-device keyboard and browser-native zoom are not certified by these viewport tests.

Local screenshots: `/tmp/palette-selector-1366-home.png`, `/tmp/palette-selector-320-home.png`, `/tmp/palette-selector-390-workforce.png`. The tested production shell runs locally on port 3195. Publishing remains subject to exact-head hosted acceptance; no main merge is included in this checkpoint.
