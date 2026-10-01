import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function read(relativePath) {
  return fs.readFileSync(
    new URL(
      "../" + relativePath,
      import.meta.url
    ),
    "utf8"
  );
}

test("Skills validation is announced and has a focus target", () => {
  const source = read(
    "components/skills-evidence-handoff-panel.tsx"
  );

  assert.equal(
    source.includes(
      'id="skills-evidence-handoff"'
    ),
    true
  );
  assert.equal(
    source.includes("tabIndex={-1}"),
    true
  );
  assert.equal(
    source.includes('role="alert"'),
    true
  );
  assert.equal(
    source.includes('aria-atomic="true"'),
    true
  );
});

test("Planning freshness remains focusable while checking and is a live status", () => {
  const source = read(
    "components/planning-evidence-handoff-card.tsx"
  );

  assert.equal(
    source.includes(
      'id="carried-planning-evidence"'
    ),
    true
  );
  assert.equal(
    source.includes(
      "aria-disabled={freshnessChecking}"
    ),
    true
  );
  assert.equal(
    source
      .replaceAll("aria-disabled", "")
      .includes("disabled={freshnessChecking}"),
    false
  );
  assert.equal(
    source.includes('role="status"'),
    true
  );
  assert.equal(
    source.includes('aria-live="polite"'),
    true
  );
  assert.equal(
    source.includes(
      "Freshness check: {statusLabel}"
    ),
    true
  );
});

test("Handoff navigation explicitly restores focus", () => {
  const source = read("app/page.tsx");

  assert.equal(
    source.includes(
      '"carried-planning-evidence"'
    ),
    true
  );
  assert.equal(
    source.includes(
      '"skills-evidence-handoff"'
    ),
    true
  );
  assert.equal(
    source.includes(
      '"workforce-planning-heading"'
    ),
    true
  );
  assert.equal(
    source.includes(
      "const focusAfterRender"
    ),
    true
  );
});

test("AI composer has visible keyboard focus and the panel resizer is keyboard operable", () => {
  const source = read(
    "components/ai-panel.tsx"
  );

  assert.equal(
    source.includes(
      'aria-label="Resize AI panel"'
    ),
    true
  );
  assert.equal(
    source.includes("tabIndex={0}"),
    true
  );
  assert.equal(
    source.includes(
      "onKeyDown={onResizeKeyDown}"
    ),
    true
  );
  assert.equal(
    source.includes(
      'aria-valuetext={`${Math.round('
    ),
    true
  );
  assert.equal(
    source.includes(
      "focus-visible:ring-2"
    ),
    true
  );
  assert.equal(
    source.includes(
      'aria-label="Ask People Analytics AI"'
    ),
    true
  );
  assert.equal(
    source.includes(
      "focus-visible:border-ring focus-visible:ring-2"
    ),
    true
  );
});

test("AI keyboard resize uses arrows plus Home and End with existing width bounds", () => {
  const source = read("app/page.tsx");

  for (const snippet of [
    "const resizeAiWithKeyboard",
    'event.key === "ArrowLeft"',
    'event.key === "ArrowRight"',
    'event.key === "Home"',
    'event.key === "End"',
    "const minimumWidth = 280",
    "window.innerWidth * 0.5",
  ]) {
    assert.equal(
      source.includes(snippet),
      true,
      snippet
    );
  }
});
