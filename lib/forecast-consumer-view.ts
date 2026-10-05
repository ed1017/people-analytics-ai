/** Browser-safe projection of the offline, reviewed consumer result. No I/O or fitting. */
type Domain = { name: string; missingInputs: string[] };
type View = { status: 'ready' | 'stale' | 'unavailable'; message: string; domains: Domain[] };
export function resolveForecastConsumerView(cached: unknown, expected: unknown, preview: unknown): View {
  const unavailable = { status: 'unavailable' as const, message: 'Conditional example unavailable: evidence could not be verified.', domains: [] };
  const stale = { status: 'stale' as const, message: 'Conditional example withheld: saved evidence does not match the current report.', domains: [] };
  if (cached === null || cached === undefined) return unavailable;
  try {
    if (JSON.stringify(cached) !== JSON.stringify(expected)) return stale;
    if (typeof cached !== 'object') return unavailable;
    const value = cached as Record<string, unknown>;
    if (value.status !== 'unqualified' || value.operationalForecast !== null || typeof value.identity !== 'string' || !/^[a-f0-9]{64}$/.test(value.identity)) return unavailable;
    const demo = value.conditionalDemo as { status?: unknown; preview?: unknown } | null;
    if (!demo || demo.status !== 'conditional-retrospective-synthetic-demo' || JSON.stringify(demo.preview) !== JSON.stringify(preview)) return stale;
    const records = value.domains as Record<string, { status?: unknown; contractStatus?: unknown; operationalForecast?: unknown; missingInputs?: unknown }>;
    const domains = ['turnover', 'satisfaction', 'hiring'].map(key => {
      const d = records[key];
      if (!d || d.status !== 'unqualified' || d.contractStatus !== 'blocked' || d.operationalForecast !== null || !Array.isArray(d.missingInputs) || !d.missingInputs.length || d.missingInputs.some(item => typeof item !== 'string' || !item.trim())) throw Error('Missing evidence detail.');
      return { name: key[0].toUpperCase() + key.slice(1), missingInputs: [...d.missingInputs] as string[] };
    });
    return { status: 'ready', message: 'Operational forecast unavailable · conditional synthetic example only', domains };
  } catch { return unavailable; }
}
