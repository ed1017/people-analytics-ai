import test from "node:test";
import assert from "node:assert/strict";
import { getScopedChatHistory, completeScopedChatTurn } from "../lib/chat-context-history.ts";

test("same-context follow-ups retain model history", () => {
  const state = completeScopedChatTurn("role-A/compared", [], "Explain", "Role A evidence");
  assert.equal(getScopedChatHistory(state, state.key).length, 2);
});
test("recompare, role and page transitions cannot reuse obsolete evidence", () => {
  let state = completeScopedChatTurn("role-A/goal-edited", [], "What goal?", "Old compared goal");
  for (const key of ["role-A/goal-compared", "role-B/not-compared", "skills/no-comparison"]) {
    const history = getScopedChatHistory(state, key);
    assert.deepEqual(history, []);
    state = completeScopedChatTurn(key, history, "Current context?", "New context");
    assert.ok(!JSON.stringify(state.messages).includes("Old compared goal"));
  }
});
test("history selection does not mutate the visible transcript or duplicate a new question", () => {
  const visible = [{role:"user",content:"Keep my original text"}];
  const state = {key:"old",messages:visible};
  const history = getScopedChatHistory(state, "new");
  const next = completeScopedChatTurn("new", history, "New question", "New answer");
  assert.equal(visible[0].content, "Keep my original text");
  assert.equal(next.messages.filter(x=>x.content === "New question").length, 1);
  assert.equal(visible.length, 1);
});
test("history remains bounded within the active context", () => {
  let state={key:"same",messages:[]};
  for(let i=0;i<8;i++)state=completeScopedChatTurn("same",getScopedChatHistory(state,"same"),`q${i}`,`a${i}`);
  assert.equal(state.messages.length,8);
  assert.equal(state.messages[0].content,"q4");
});
