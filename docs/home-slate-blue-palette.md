# Slate blue workspace palette

This implements the explicitly approved color values directly; it does not depend on or reproduce an image. The Ask AI surfaces (Home composer and shared Ask AI panel) and shared goal/filter strip use `#243B5A`. Their Send actions use `#3979D5`. Title, navigation, charts, dashboard cards, textarea interiors and global primary tokens stay unchanged.

The application main selects `data-workspace-palette="slate-blue"`. Changing that single attribute to `original-navy-teal` restores the named original palette: panels/strip `#13223A`, Home Send `#82D9C7`, shared Send `#A5C5EE`, text `#0B1426`. No settings interface or storage change is introduced.

The approved blue has only 4.31:1 contrast with white and 4.26:1 with the former dark text. Black Send text gives 4.87:1. Muted labels on slate blue give 6.47:1. A light inset boundary and visible focus outline distinguish controls. Disabled actions keep their existing disabled behavior and dimming; no claim is made that disabled contrast meets an enabled-control threshold.

Validation: 1,192 unit tests; 42 palette browser checks plus 57 compact-layout checks across desktop, mobile and 200% reflow; full lint, standalone TypeScript, production build and whitespace checks pass. Browser checks use intercepted synthetic fixtures and make no model calls. The initial shared-page fixture lacked required workforce fields and was completed; rollback assertions wait for the existing button color transition. Final tests verify exact computed colors, text/focus contrast, hover and disabled behavior, named rollback, unchanged title/navigation and no horizontal overflow or runtime errors. Logs: `/tmp/palette-{unit,lint,tsc,build,compact}.log`, `/tmp/palette-browser-final.log`; screenshots `/tmp/palette-{desktop,mobile,zoom}-{home,workforce}.png`.

Separate branch based on PR134 merge `63057500acf2c019ecb0523e2ad982caefdf7b88`. Tradeoff PR133 is excluded. No further Library download, DB/auth/security/permissions/billing/model boundary or held eNPS changes.
