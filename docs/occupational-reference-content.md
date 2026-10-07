# Occupational reference content

The explorer reads internal job profiles, stored O*NET mappings and internal role requirements separately from external occupation descriptions and skills. It never reads individual employee records or uses mappings as evidence of employee proficiency.

## Available content

- Search by profile name/code or mapped occupation name/code; filter mapped and unmapped profiles only when the mapping source is available.
- Inspect the selected profile's stored mapping method and required or preferred internal skills, including the stored 1–5 proficiency expectation.
- Every stored mapping carries a review notice and links its occupation title/code to the official profile. When both profile and mapping sources are available, the page shows how many internal profiles share the occupation, including inactive profiles. Search filters do not change this count. Multiple profiles sharing an occupation still need individual duties-based review; neither mapping coverage nor a stored method establishes match quality.
- Browse the stored occupation catalog independently of internal profiles. Occupation-level essential skills use their original importance (1–5) and level (0–7) scales. Ratings flagged for suppression or nonrelevance are omitted. Different releases are not combined into one rating.
- Browse stored software examples. They are examples associated with an occupation, not company requirements or a measure of current market demand.
- Three locally included public excerpts—Software Developers, Data Scientists and Registered Nurses—provide condensed descriptions, selected tasks, essential-skill names and general preparation guidance. Their inclusion does not imply any internal mapping.

Internal tables and external-reference tables have independent availability states. A failed read never becomes a zero count, an unmapped classification or a fabricated fallback profile. Reads use explicit columns, stable pagination and a timeout. The application stores no new credentials and does not contact O*NET at runtime.

Server diagnostics distinguish missing configuration, access denial, timeout, cancellation, schema mismatch and connection failure using an allowlisted source name, category, HTTP status and known provider code. Messages, row content and connection details are excluded. An access-denied response cancels pending reads without retrying or changing the access path.

The default view keeps role and occupation populations, skill scales, mapping review status and source failures beside the content. Native disclosures expose mapping methods and shared-profile counts, preparation guidance, and detailed provenance. Missing stored detail sources share one status line; available public excerpts remain visible.

## Public sources

Public excerpts were checked on **2026-10-06**, when the [O*NET database release](https://www.onetcenter.org/database.html) was **31.0**. The excerpts come from the official OnLine occupation profiles and are editorial summaries, not a complete database import:

- [Software Developers — 15-1252.00](https://www.onetonline.org/link/summary/15-1252.00)
- [Data Scientists — 15-2051.00](https://www.onetonline.org/link/summary/15-2051.00)
- [Registered Nurses — 29-1141.00](https://www.onetonline.org/link/summary/29-1141.00)
- [O*NET rating scales and suppression guidance](https://www.onetonline.org/help/online/scales)
- [O*NET data license and attribution guidance](https://www.onetcenter.org/license_db.html), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

The public preparation excerpts describe broad Job Zone guidance. They do not establish a company hiring rule or a jurisdiction's licensing requirements. Other occupations link directly to official tasks and preparation guidance because these categories are not stored in the application's available reference tables.

The page labels stored release and refresh values as source-provided metadata. A stored timestamp does not prove when an import occurred or that imported rows match a particular official release. Checking the public release does not independently validate stored occupation rows or internal role mappings.

## Verification boundary

Automated tests use explicitly synthetic internal profiles. They check pagination, partial-source failures, exact occupation scoping, unknown values, suppression, differing scales and releases, and public-source links. Validating actual stored mappings and reference rows requires a separately authorized runtime review with the application's existing access. No private rows or operational evidence are included in the public fixtures.
