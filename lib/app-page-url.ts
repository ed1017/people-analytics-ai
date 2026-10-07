// @ts-expect-error Native Node tests share TypeScript source.
import { appPageMetadata } from "./app-navigation.ts";
import type { AppPage } from "./types";

export const APP_PAGE_CHANGE_EVENT = "app-page-change";

export function currentAppPage(): AppPage {
  return appPageFromSearch(window.location.search);
}

export function serverAppPage(): AppPage {
  return "home";
}

export function subscribeToAppPage(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  window.addEventListener(APP_PAGE_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(APP_PAGE_CHANGE_EVENT, onChange);
  };
}

/** Only catalog destinations are navigable; legacy links keep their current meaning. */
export function resolveAppPage(value: string | null): AppPage {
  if (value === "overview" || value === "career-mobility") return "workforce";
  if (value === "workforce-planning") return "planning-overview";
  return value !== null && Object.hasOwn(appPageMetadata, value)
    ? value as AppPage
    : "home";
}

export function appPageFromSearch(search: string): AppPage {
  const values = new URLSearchParams(search).getAll("page");
  return resolveAppPage(values.length === 1 ? values[0] : null);
}

/** Change only the destination. Goals, chat and filters remain in the app workspace. */
export function appPageHref(
  location: Pick<Location, "pathname" | "search" | "hash">,
  page: AppPage,
): string {
  const params = new URLSearchParams(location.search);
  const destination = resolveAppPage(page);
  if (destination === "home") params.delete("page");
  else params.set("page", destination);
  const search = params.toString();
  return `${location.pathname}${search ? `?${search}` : ""}${location.hash}`;
}
