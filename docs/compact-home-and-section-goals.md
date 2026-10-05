# Compact Home and section goal context

Home keeps the full approved intro and instructions behind one default-collapsed “Intro & instructions” control below the goal toolbar. The two intro sentences occupy separate paragraphs. Step 2 explicitly supports multiple goals, and the composer hint includes stakeholders. The first intro sentence remains the released wording while its replacement is pending. The feedback invitation follows LinkedIn in the desktop header and wraps as space narrows.

Section chat shows the approved topic helper followed by the exact selected goal. General exploration has an honest no-goal fallback; unsupported pages continue to state that AI analysis is unavailable. Conversation details retain the separate evidence-scope explanation.

Requests continue to use the existing bounded goal-context fields. A client-only context key rejects stale handlers and replies after goal, evidence, readiness or carried-reference changes. Pending work is cancelled on section context changes, duplicate sends share the existing request gate, and request failures preserve a newly typed draft. No model-input fields, source records, private brief fields or persistence schemas are added. Goal context does not filter enterprise evidence.

Validation: 886 unit tests, lint, TypeScript and production build passed. Production-shell browser suites passed 73 section/context/layout assertions, 58 pinned-goal restoration assertions and 57 docked-composer assertions at desktop, mobile and 200% reflow sizes. They use synthetic intercepted aggregate responses, including A→B→A, pending goal/evidence changes, stale handlers, reload, sidebar navigation, no goal and failure recovery. These checks do not establish hosted or live-model behavior.
