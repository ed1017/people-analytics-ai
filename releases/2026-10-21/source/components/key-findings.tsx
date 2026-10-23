import type { Findings } from '@/lib/key-findings';

/** Observations from the page's current aggregate, never a model-generated answer. */
export function KeyFindings({ findings }: { findings: Findings | null }) {
  if (!findings || !findings.items.length) return null;
  return <section aria-label="Key findings" className="mb-4 rounded-lg border bg-muted/20 p-3">
    <h3 className="text-sm font-semibold">Key findings</h3>
    <p className="mt-1 text-xs text-muted-foreground">{findings.scope}</p>
    <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
      {findings.items.map(item => <li key={item}>{item}</li>)}
    </ul>
  </section>;
}
