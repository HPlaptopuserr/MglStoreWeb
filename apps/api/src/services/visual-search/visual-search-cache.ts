import type { VisualIndex } from "./visual-search-index";

/** Cheap revision checks avoid transferring all vectors on every search. */
export class VisualIndexCache {
  private cached?: { revision: string; index: VisualIndex; loadedAt: number };
  private checkedAt = 0;
  private pending?: Promise<VisualIndex>;
  constructor(
    private readonly deps: {
      revision(): Promise<string>;
      load(): Promise<VisualIndex>;
      now(): number;
    },
  ) {}

  get(): Promise<VisualIndex> {
    if (this.cached && this.deps.now() - this.checkedAt < 15_000)
      return Promise.resolve(this.cached.index);
    this.pending ??= this.refresh().finally(() => {
      this.pending = undefined;
    });
    return this.pending;
  }

  private async refresh() {
    const revision = await this.deps.revision();
    if (
      !this.cached ||
      this.cached.revision !== revision ||
      this.deps.now() - this.cached.loadedAt >= 5 * 60_000
    ) {
      const index = await this.deps.load();
      this.cached = { revision, index, loadedAt: this.deps.now() };
    }
    this.checkedAt = this.deps.now();
    return this.cached.index;
  }
}
