import test from "node:test";
import assert from "node:assert/strict";
import { appNavigationSections } from "../lib/app-navigation.ts";
import { appPageFromSearch, appPageHref, resolveAppPage } from "../lib/app-page-url.ts";

test("every current destination round-trips through the page parameter", () => {
  for (const page of ["home", "decision-brief", ...appNavigationSections.flatMap(section => section.pages)]) {
    assert.equal(resolveAppPage(page), page);
    const href = appPageHref({pathname: "/", search: "", hash: ""}, page);
    assert.equal(appPageFromSearch(new URL(href, "https://example.test").search), page);
  }
});

test("legacy pages normalize to the current workforce and planning destinations", () => {
  for (const [legacy, current] of [["overview", "workforce"], ["career-mobility", "workforce"], ["workforce-planning", "planning-overview"]]) {
    assert.equal(appPageFromSearch(`?page=${legacy}`), current);
    assert.equal(appPageHref({pathname: "/", search: `?page=${legacy}`, hash: ""}, legacy), `/?page=${current}`);
  }
});

test("missing, ambiguous, external, executable and unknown destinations resolve to Home", () => {
  for (const value of [null, "", "constructor", "__proto__", "toString", "not-a-page", "Skills", " skills", "skills?carry=true", "skills#run", "/skills", "https://example.test", "javascript:alert(1)", "workforce/../../api/chat"]) {
    assert.equal(resolveAppPage(value), "home");
    const search = value === null ? "" : `?${new URLSearchParams({page: value})}`;
    assert.equal(appPageFromSearch(search), "home");
  }
  assert.equal(appPageFromSearch("?page=skills&page=finance"), "home");
});

test("navigation preserves unrelated query values and anchors and only writes page", () => {
  const location = {pathname: "/", search: "?campaign=fall%20review&tag=a&tag=b&page=workforce", hash: "#details"};
  const next = new URL(appPageHref(location, "scenario-modeling"), "https://example.test");
  assert.deepEqual([...next.searchParams], [["campaign", "fall review"], ["tag", "a"], ["tag", "b"], ["page", "scenario-modeling"]]);
  assert.equal(next.hash, "#details");
  assert.equal(next.pathname, "/");
  assert.equal(next.searchParams.has("goal"), false);
  assert.equal(next.searchParams.has("chat"), false);
  const home = new URL(appPageHref(next, "home"), "https://example.test");
  assert.deepEqual([...home.searchParams], [["campaign", "fall review"], ["tag", "a"], ["tag", "b"]]);
  assert.equal(home.hash, "#details");
});

test("repeated destinations have stable URLs and duplicate page parameters are removed", () => {
  const initial = new URL("https://example.test/?campaign=fall&page=skills&page=finance");
  const href = appPageHref(initial, "skills");
  assert.equal(href, "/?campaign=fall&page=skills");
  assert.equal(appPageHref(new URL(href, initial), "skills"), href);
  assert.equal(appPageHref(initial, "home"), "/?campaign=fall");
});
