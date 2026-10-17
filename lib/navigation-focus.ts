/** Reveal a newly entered context without animated motion or an extra Tab stop. */
export function focusNavigationTarget(target: HTMLElement | null, pageStart = false) {
  if (!target) return;
  target.focus({preventScroll: true});
  if (pageStart) {
    window.scrollTo({top: 0, left: 0, behavior: 'instant'});
    return;
  }
  const headerBottom = Math.max(0, document.querySelector('.app-top-header')?.getBoundingClientRect().bottom ?? 0);
  window.scrollBy({top: target.getBoundingClientRect().top - headerBottom - 12, behavior: 'instant'});
}
