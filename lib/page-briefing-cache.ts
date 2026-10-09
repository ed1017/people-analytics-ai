export type PageBriefingResult = { text: string; error: string | null };
/** Bounded session cache, with one queued request at a time and no automatic retries. */
export class PageBriefingCache {
  private epoch=0;
  invalidateDataset(){this.epoch++;this.entries.clear();}
  private entries = new Map<string, { promise: Promise<PageBriefingResult | null>; expires: number }>();
  private queue: Promise<unknown> = Promise.resolve();
  private ttl: number;
  private limit: number;
  private now: () => number;
  constructor(ttl = 300_000, limit = 32, now = () => Date.now()) { this.ttl=ttl; this.limit=limit; this.now=now; }
  get(key: string, load: () => Promise<PageBriefingResult | null>, retry = false) {
    const found = this.entries.get(key);
    if (found && !retry && found.expires > this.now()) return found.promise;
    const epoch=this.epoch;
    const promise = this.queue.then(()=>epoch===this.epoch?load():null).catch(() => ({ text: "", error: "The page briefing is unavailable. Try again." })).then(value=>epoch===this.epoch?value:null);
    this.queue = promise;
    void promise.then(result => { if (result === null && this.entries.get(key)?.promise === promise) this.entries.delete(key); });
    this.entries.delete(key);
    this.entries.set(key, { promise, expires: this.now() + this.ttl });
    while (this.entries.size > this.limit) this.entries.delete(this.entries.keys().next().value!);
    return promise;
  }
}
