import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL("../" + path, import.meta.url), "utf8");

test("Planning destinations are first-class app pages", async () => {
  const [types, navigation] = await Promise.all([
    read("lib/types.ts"),
    read("lib/app-navigation.ts"),
  ]);

  for (const page of [
    "planning-overview",
    "scenario-modeling",
    "position-workforce-design",
    "workforce-response",
    "execution-feasibility",
  ]) {
    assert.match(types, new RegExp('"'+page+'"'));
    assert.match(navigation, new RegExp('"'+page+'"'));
  }

  assert.match(
    navigation,
    /defaultPage:\s*"planning-overview"/
  );
  assert.match(
    navigation,
    /page === "workforce-planning"[\s\S]*return "strategy"/
  );
});

test("Planning destinations keep the shared workspace mounted and AI-grounded", async () => {
  const page = await read("app/page.tsx");

  assert.match(
    page,
    /"planning-overview": "overview"/
  );
  assert.match(
    page,
    /"scenario-modeling": "plan"/
  );
  assert.match(
    page,
    /"position-workforce-design": "design"/
  );
  assert.match(
    page,
    /"workforce-response": "respond"/
  );
  assert.match(
    page,
    /"execution-feasibility": "execute"/
  );
  assert.match(
    page,
    /page: planningWorkspaceActive[\s\S]*\? "workforce-planning"[\s\S]*: activePage/
  );
  assert.match(
    page,
    /requestedView=\{[\s\S]*planningRequestedView \?\? "overview"/
  );
});

test("Internal Planning navigation updates the app destination", async () => {
  const planningPage = await read(
    "components/pages/workforce-planning-page.tsx"
  );

  assert.match(
    planningPage,
    /requestedView: PlanningWorkspaceView/
  );
  assert.match(
    planningPage,
    /onPlanningDestinationChange/
  );
  assert.match(
    planningPage,
    /onViewChange=\{changeWorkflowView\}/
  );
  assert.match(
    planningPage,
    /onNavigate=\{changeWorkflowView\}/
  );
});
