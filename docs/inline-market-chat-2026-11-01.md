# Inline market insights in chat

Status: live on November 1, 2026.

The user explicitly asked the market prompt to respond with two dropdowns in chat. This refines PR518's visible reader rather than adding another module or AI request.

## Interaction contract

Overview's third Explore prompt sends a dedicated local callback through HomeChatWelcome/WelcomeControls into OverallOverviewPage. The page opens a Local market insights response inside the actual Overview conversation, including when that conversation is initially empty. There are exactly two dropdowns, Country and Role, followed by Show market insights. Role choices depend on country; changing either selection clears stale results. Existing canonical charts and source Details are reused.

The local response is not submitted to a provider, appended to model history or saved as a plan assumption. Repeated clicks focus the same card. Close returns focus to the composer. Workspace and conversation-reset boundaries prevent carrying the selection into another planning scope. Typed unsent draft, existing messages and saved work remain unchanged. No automatic source attachment or invented market-tightness status occurs.

Supported entry is the existing welcome prompt; this change does not create a separate trigger in already-populated chat. Results remain US/UK national references, with conditional duty and source limits intact. The separate conditional IT release is included without altering any of its mappings or records.

## Verification and limits

Independent review and 12 focused tests passed. Expanded affected suites passed 32 tests; composed market/IT suites passed 38. A focused Overview type graph passed with zero diagnostics using the app's dom.iterable configuration. The standalone public-home-integration VM test fails before assertions on both unchanged PR518 baseline and this branch because its JSON loader does not provide the .default.metadata wrapper; it is not claimed as passed or as a new product failure. Packaged build, exact CI and staged/public desktop/mobile acceptance passed as recorded below.

Browser acceptance must establish the actual in-chat location, two controls, dependent choices, canonical facts, repeated-click behavior, focus, workspace/reset transitions and saved-work/draft preservation. Provider calls remain blocked; no fresh AI-answer acceptance is claimed. Release identifiers and terminal results follow.

## Verified release

- PR521 runtime/head `956a6c85cb830c6ea5bf03d5b70a426cfab03420`, merge `76c5cab40bf478049d666130bdb45d6ff33f12f6`, exact CI `41259590381` success. PR520 is an included ancestor, not a competing deployment.
- Deployment `dpl_CGjAvkjRKUfcmRo2pNo24WUw5aaq`, host `people-analytics-85r4en6r7-ed-56dc.vercel.app`. Archive SHA256 `27f5db54d5551330865987df87235264bd8e047b5232272e6bc925915dbc8505`, 1,221 inputs and 1,076 manifest entries. Full build/TypeScript passed; private inputs/dependencies unchanged.
- Staged 1440/390 each passed eight workflow groups, HTTP 200, zero page errors/blocked requests. Protected transport cleanup timed out after assertions with 11/10 late cleanup errors. These are retained as transport limitations, not hidden as a clean staged shutdown.
- After exact promotion, `www.ed-ai.app` identity was verified. Direct public 1440/390 each passed eight groups, HTTP 200, zero page/bridge errors or blocked requests, clean/drained. No stage asset replay or provider/chat POSTs.
- Actual browser acceptance covered restored prior goals, risk-first three-card ordering, local response inside Overview conversation, exactly two selectors, repeated-click single card, US software/BI and UK HR canonical facts, stale clearing, source links, close-to-composer focus, reset/workspace clearing, unsent draft and saved-work preservation. Screenshots inspected; mobile has no horizontal overflow. Tall desktop element captures have a sticky header overlapping the top, not a functional content failure.
- A transition into an already-populated provider conversation was not browser-tested; the starter remains the existing welcome entry. Component/source contracts establish local state wiring, not fresh provider-answer quality. Readiness was mocked and provider calls blocked.
- Evidence: `integration-evidence/INLINE-MARKET-CHAT-RELEASE.json` and `inline-market-chat-public-956a6c8-{1440,390}.json`.

## Next source boundaries

No further automatic role match is justified by the modeled templates. Corporate Development needs a reviewed M&A/financial-analysis occupation and source rows; Customer Success needs support/adoption-compatible evidence, not service-sales substitution; Product Manager requires occupation-fit review. India public data identified so far is broad occupation-division context; registered/paid microdata remains outside scope. Available applicants and measured role-specific hiring duration remain unverified. Lab stays user-owned and the target overlay remains preview-only.
