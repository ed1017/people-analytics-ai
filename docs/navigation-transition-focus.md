# Page and guided-demo transition focus

Reproduced on production before editing: at1440px, expanding the demo review and scrolling down left Baseline at scrollY384 after navigation; at393px, Review selected Action Plan left the new heading at viewport y=-340 (scrollY561). The393px check used a narrow desktop-browser viewport, not phone emulation or the original reviewer's browser zoom.

Actual page changes now focus the page heading and scroll to the top after rendering, including Back/Forward. Initial hydration and same-page input/filter updates do not trigger this behavior. Explicit Skills-to-Planning and return-to-Skills handoffs share the navigation focus request and take precedence over the default heading.

The simple guided demo tracks inputs/comparison/review/saved stages separately from input values. On a stage change, it focuses the relevant heading and reveals it below any visible header. The phone header can scroll offscreen, so its bottom is clamped to zero. Animation frames are canceled on superseding transitions/unmount. Inactive journeys and the separate service-demand bridge are excluded. Headings use tabIndex=-1 for programmatic focus without adding Tab stops.

`tests/manual/navigation-transition.browser.mjs` checks1440/393: visible focused headings after screenshots, deep review-to-Baseline, cancel review, input focus preservation, filters, return to Overview, Back/Forward, no horizontal overflow and page errors. NAVIGATION_HANDOFF=true includes both explicit handoff targets. For a credentials-free local app, NAVIGATION_USE_PUBLIC_EVIDENCE=true reads only existing public GET /api endpoints from www.ed-ai.app; all mutations, external browser requests and BLS requests remain blocked. This is local UI against read-only public evidence, not hosted-preview proof. Production tests use the normal production origin directly.

Independent review caught and corrected an initial conflict between generic page focus and existing handoff callbacks. The first local visibility assertion also allowed negative header coordinates; strengthened viewport assertions and screenshots caught it before publication. No dataset, security, credential or paid-AI change.
