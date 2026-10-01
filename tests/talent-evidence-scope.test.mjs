import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  enterpriseTalentEvidenceScope,
  evidenceScopeForAi,
  hasNarrowBusinessSelection,
} from "../lib/talent-evidence-scope.ts";

test("enterprise Talent evidence does not inherit a narrow dashboard selection", () => {
  const scope = enterpriseTalentEvidenceScope({
    label: "Enterprise workforce",
    asOf: "2026-09-30",
    populationLabel: "employees",
    populationCount: 10000,
    supportedBreakdowns: ["skill"],
  });

  const selected = {
    country: "Global workforce",
    businessUnit: "Data & AI",
    level: "All levels",
  };

  assert.equal(hasNarrowBusinessSelection(selected), true);

  const context = evidenceScopeForAi(scope, selected);
  assert.equal(context.evidence_scope, "enterprise");
  assert.equal(context.evidence_population_count, 10000);
  assert.equal(context.filters_applied.country, false);
  assert.equal(context.filters_applied.businessUnit, false);
  assert.equal(context.filters_applied.level, false);
  assert.equal(context.selected_context_narrows_evidence, false);
  assert.match(context.selected_business_context, /Data & AI/);
});

test("default dashboard selection is still explicitly separate from evidence scope", () => {
  const selected = {
    country: "Global workforce",
    businessUnit: "All business units",
    level: "All levels",
  };
  assert.equal(hasNarrowBusinessSelection(selected), false);
});

test("chat grounding contains the scope guard and unsupported-breakdown rule", () => {
  const source = fs.readFileSync(
    new URL("../app/api/chat/route.ts", import.meta.url),
    "utf8"
  );

  assert.match(source, /CURRENT SELECTED BUSINESS CONTEXT/);
  assert.match(source, /Evidence scope metadata overrides selected-context labels/);
  assert.match(source, /Country, business-unit, and level skill breakdowns are not available/);
  assert.match(source, /Country, business-unit, and level L&D breakdowns are not available/);
  assert.match(source, /Current-organization preference coverage is the only business-unit-specific breakdown supplied here/);
  assert.match(source, /Succession is intentionally company-summary only/);
});

test("enterprise Talent planning tools expose unfiltered scope metadata", () => {
  const source = fs.readFileSync(
    new URL("../lib/people-analytics-tools.ts", import.meta.url),
    "utf8"
  );

  assert.match(
    source,
    /Company internal talent pool for the target job profile/
  );
  assert.match(
    source,
    /Company recruiting evidence for the target job profile/
  );
  assert.match(
    source,
    /Selected dashboard country, business-unit, and level context does not filter this tool result/
  );
});
