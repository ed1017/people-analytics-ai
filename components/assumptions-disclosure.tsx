import type { ReactNode } from 'react';

/** Explanatory detail only: keep scope, missing data and action gates at the call site. */
export function AssumptionsDisclosure({children, className = '', evidenceDetails = false}: {
  children: ReactNode;
  className?: string;
  evidenceDetails?: boolean;
}) {
  return <details data-assumptions-disclosure data-answer-evidence-details={evidenceDetails || undefined} className={`assumptions-disclosure min-w-0 text-sm leading-relaxed ${className}`}>
    <summary className="min-h-11 cursor-pointer rounded py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Assumptions &amp; limits</summary>
    <div className="space-y-2 break-words pb-2">{children}</div>
  </details>;
}
