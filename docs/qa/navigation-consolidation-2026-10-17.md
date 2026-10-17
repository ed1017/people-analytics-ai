# Navigation consolidation checkpoint

The deferred sequence in `calm-guided-demo-release.md` is reconciled against main through PR #290:

- Full-width Baseline and Skills with optional AI: shipped PR #279, with Skills follow-up #286.
- Editable workload/qualified-capacity demonstration: shipped #280/#282; Future of Work example #281.
- Saved choice/target/cash consistency and monthly shortages: shipped #284/#287/#289; independent arithmetic audit #290.
- Explicit measured progress: existing Track implementation remains behind its existing flag. No flag or population activation is included.
- Complete navigation consolidation: this bounded continuation aligns existing destinations; it does not add a page or change workflow logic.

Overview, Plan and Evidence now retain section context on child pages. Exact destination uses `aria-current="page"`; child destinations use `aria-current="location"`. Assess & Evaluate remains an explicitly future placeholder outside those three active sections. Existing sidebar shortcuts remain. More contains More evidence, Planning tools and the evaluation placeholder, with each prior sidebar destination retained exactly once. Visiting a secondary page opens its containing group; direct Skills/Attrition/etc. shortcuts no longer unnecessarily expand More.

This is a navigation slice, not a claim that all roadmap work is complete. Population activation, paid model acceptance, operational forecasting and expanded access remain outside this release. The requested next fresh visual review should consider polish, chart differentiation, color, balance and visual impact; it is not substituted for this implementation.

Targeted validation: section mapping and destination-preservation tests, keyboard disclosures, mobile drawer dismissal and representative Evidence/Plan child navigation. Reuse existing arithmetic and saved-plan validation; do not repeat the broad HR flow for a navigation-only change.
