import {validDatasetToken} from './dataset-identity.mjs';

type TabStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export const MAX_EXPLORATION_DRAFT_LENGTH = 200000;
export function explorationDraftKey(token: string) {
  if (!validDatasetToken(token)) throw Error('Invalid dataset identity');
  return `insights-to-action.exploration-draft.v1.${token}`;
}

/** Only the unsent text is retained in this tab. No transcript, plan or submission. */
export class ExplorationDraftStore {
  private readonly key: string;
  private readonly port: TabStorage;
  readonly datasetToken: string;
  private initialized = false;
  private readable = false;
  private pendingClear = false;
  private input: string | null = null;
  notice: string | null = null;
  constructor(port: TabStorage, datasetToken: string) {
    this.port = port;
    this.datasetToken = datasetToken;
    this.key = explorationDraftKey(datasetToken);
  }
  read(): string | null {
    if (this.initialized) return this.input;
    this.initialized = true;
    try {
      const raw = this.port.getItem(this.key);
      if (raw !== null) {
        if (raw.length > MAX_EXPLORATION_DRAFT_LENGTH * 6 + 100) throw Error('Oversized draft');
        const value = JSON.parse(raw);
        if (!value || value.version !== 1 || typeof value.input !== 'string' || value.input.length > MAX_EXPLORATION_DRAFT_LENGTH || Object.keys(value).sort().join() !== 'input,version') throw Error('Invalid draft');
        this.input = value.input;
      }
      this.readable = true;
    } catch {
      this.notice = 'The General exploration draft could not be read in this tab. Its stored copy was kept. Keep this tab open; reload after resolving browser storage.';
    }
    return this.input;
  }
  save(input: string) {
    if (this.pendingClear && input === '') {this.clear(); return;}
    // Never overwrite unread or malformed bytes, including during hydration.
    if (!this.readable) return;
    try {
      if (input.length > MAX_EXPLORATION_DRAFT_LENGTH) throw Error('Draft limit exceeded');
      if (input !== this.input || this.notice) {
        if (input === '') {if (this.input !== null || this.notice) this.port.removeItem(this.key);}
        else this.port.setItem(this.key, JSON.stringify({version: 1, input}));
      }
      this.input = input;
      this.notice = null;
    } catch {
      this.notice = 'The General exploration draft could not be saved in this tab (browser storage unavailable or draft too long). Keep this tab open and retry saving. The previous tab copy was kept.';
    }
  }
  /** Explicit reset/clear may discard even an unreadable tab copy. */
  clear() {
    try {
      this.port.removeItem(this.key);
      this.input = ''; this.initialized = true; this.readable = true; this.pendingClear = false; this.notice = null;
    } catch {
      this.pendingClear = true;
      this.notice = 'The General exploration draft could not be cleared from this tab. Keep this tab open and retry saving before reloading.';
    }
  }
}
