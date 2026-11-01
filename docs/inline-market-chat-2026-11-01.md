# Inline market insights in chat

Status: reviewed implementation, not published.

The user explicitly asked the market prompt to respond with two dropdowns in chat. This refines PR518's visible reader rather than adding another module or AI request.

## Interaction contract

Overview's third Explore prompt sends a dedicated local callback through HomeChatWelcome/WelcomeControls into OverallOverviewPage. The page opens a Local market insights response inside the actual Overview conversation, including when that conversation is initially empty. There are exactly two dropdowns, Country and Role, followed by Show market insights. Role choices depend on country; changing either selection clears stale results. Existing canonical charts and source Details are reused.

The local response is not submitted to a provider, appended to model history or saved as a plan assumption. Repeated clicks focus the same card. Close returns focus to the composer. Workspace and conversation-reset boundaries prevent carrying the selection into another planning scope. Typed unsent draft, existing messages and saved work remain unchanged. No automatic source attachment or invented market-tightness status occurs.

Supported entry is the existing welcome prompt; this change does not create a separate trigger in already-populated chat. Results remain US/UK national references, with conditional duty and source limits intact. The separate conditional IT release is included without altering any of its mappings or records.

## Verification and limits

Independent review and 12 focused tests passed. Expanded affected suites passed 32 tests; composed market/IT suites passed 38. A focused Overview type graph passed with zero diagnostics using the app's dom.iterable configuration. The standalone public-home-integration VM test fails before assertions on both unchanged PR518 baseline and this branch because its JSON loader does not provide the .default.metadata wrapper; it is not claimed as passed or as a new product failure. Packaged build, exact CI and actual staged/public desktop/mobile acceptance remain release gates.

Browser acceptance must establish the actual in-chat location, two controls, dependent choices, canonical facts, repeated-click behavior, focus, workspace/reset transitions and saved-work/draft preservation. Provider calls remain blocked; no fresh AI-answer acceptance is claimed. Release identifiers and terminal results will be added after verification.
