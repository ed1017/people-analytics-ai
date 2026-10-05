# Comfortable Home composer height

The owner screenshot shows a full-width but shallow Home input, not a width or overlay problem. Source history identifies the cause: `70b35e8` changed Home from two rows/minimum 80px to one row/minimum 48px. PR129 did not introduce that sizing change. The section-page composer already uses five rows and a 128px minimum and is unchanged.

Home now starts with three rows and a 112px minimum, retaining 16px input text, the exact placeholder, content-column width, manual resize and content-driven growth. Long drafts remain intact and scroll within the existing 320px/visible-viewport cap. The dock sets a smaller minimum when its visible-viewport cap is below 112px, preventing the enlarged minimum from overriding keyboard/short-viewport constraints. No page text, grid or response typography is enlarged.

Validation: 36 composer checks at 1721px, 1366px, 390px and 683px widths cover short/long/cleared input, complete content, caret access, content-column alignment, width changes, overflow, Send and a simulated keyboard VisualViewport. Desktop/mobile input screenshots were inspected. The final source also passes 60 unified Action Plan flow checks and 57 existing compact-layout checks. Browser APIs are intercepted fixtures; the keyboard test is simulated, not a physical-device claim.

The existing manual real-model harness tests bounded workforce-agent reviews, not mixed-method Home generation, and requires a confirmed relevant configuration fix before live execution. Running its default refusal path sent no request. No such fix is recorded for the earlier authentication failure; it was not retried. Automatic mixed-method instruction compliance and live model quality remain unverified. No claimed effectiveness is added.

Source checkpoint begins at tested PR129 head `58f8fca3bfc92222b3ee97b69b61f0f71fdb96aa`; source branches remain preserved. Logs: `/tmp/composer-{unit,lint,tsc,build}.log` and `/tmp/composer-home-{composer-space,unified-attachment,compact-layout}.log`; screenshots `/tmp/home-composer-{wide,desktop,mobile,reflow}.png`. Final local production test server: port 3150.

All 1,064 unit tests (zero failures/skips), 153 browser assertions, full lint, standalone TypeScript, production Turbopack build and whitespace checks pass at this checkpoint. Held eNPS files and the existing model-input boundary are unchanged.
