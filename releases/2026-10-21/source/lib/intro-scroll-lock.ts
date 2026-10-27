/** Contain native-dialog scrolling without changing the page's position or saved work. */
export function lockIntroPageScroll(doc: Document): () => void {
  const elements = [doc.documentElement, doc.body];
  const previous = elements.map(element => ({
    element,
    value: element.style.getPropertyValue('overflow'),
    priority: element.style.getPropertyPriority('overflow'),
  }));
  for (const {element} of previous) element.style.setProperty('overflow', 'hidden');
  return () => {
    for (const {element, value, priority} of previous) {
      if (value) element.style.setProperty('overflow', value, priority);
      else element.style.removeProperty('overflow');
    }
  };
}
