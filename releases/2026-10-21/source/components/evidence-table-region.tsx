'use client';

import {useEffect, useId, useRef, useState, type ReactNode} from 'react';

/** Preserve every column and native keyboard scrolling when the evidence pane narrows. */
export function EvidenceTableRegion({label, children, className = ''}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const region = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const [overflowing, setOverflowing] = useState(false);
  useEffect(() => {
    const element = region.current;
    if (!element) return;
    const measure = () => setOverflowing(element.scrollWidth > element.clientWidth + 1);
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    return () => {cancelAnimationFrame(frame); observer.disconnect();};
  }, []);
  return <div className={`min-w-0 ${className}`}>
    <div ref={region} data-evidence-table role="region" aria-label={label}
      aria-describedby={overflowing ? hintId : undefined} tabIndex={0}
      className="overflow-x-auto overscroll-x-contain rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
      {children}
    </div>
    {overflowing && <p id={hintId} className="mt-2 text-sm text-muted-foreground">Scroll horizontally for more columns. Use the arrow keys when the table is focused.</p>}
  </div>;
}
