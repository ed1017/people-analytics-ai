import type { Findings } from '@/lib/key-findings';

/** Observations from the page's current aggregate, never a model-generated answer. */
export function KeyFindings({ findings }: { findings: Findings | null }) {
  if (!findings || !findings.items.length) return null;
  return <section aria-label="Key findings" className="key-findings mb-5 border-l-2 border-primary/40 pl-4 py-1">
    <h3 className="text-sm font-semibold tracking-wide">Key findings</h3>
    <p className="mt-1 text-xs text-muted-foreground">{findings.scope}</p>
    <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-relaxed">
      {findings.items.map(item => <li key={item}>{item}</li>)}
    </ul>
  </section>;
}
