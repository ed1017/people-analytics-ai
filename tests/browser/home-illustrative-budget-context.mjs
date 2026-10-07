// Run the real Home regeneration/comparison/attachment/reopen flow with the exact
// reported wording. Model and source transport remain explicitly intercepted.
process.env.RETENTION_EXACT_REQUEST='reduce turnover by 2 percentage points over 12 months with a $100,000 illustrative budget';
await import('./home-retention-context-recovery.mjs');
