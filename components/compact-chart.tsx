'use client';

import {useEffect, useRef, useState, type ReactNode} from 'react';

/** Measure the plotting width, rather than stretching text and height with the SVG. */
export function CompactChart({label, title, children, minWidth = 300}: {
  label: string;
  title: string;
  minWidth?: number;
  children: (width: number) => ReactNode;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(minWidth);
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const measure = () => setWidth(Math.max(minWidth, Math.floor(node.clientWidth)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [minWidth]);
  return <div ref={container} role="region" aria-label={label} tabIndex={0} className="min-w-0 overflow-x-auto rounded focus-visible:outline-2 focus-visible:outline-ring">
    <svg role="img" aria-label={label} viewBox={`0 0 ${width} 230`} width={width} height={230} className="block max-w-none text-foreground">
      <title>{title}</title>
      {children(width)}
    </svg>
  </div>;
}
