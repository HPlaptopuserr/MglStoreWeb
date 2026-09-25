import type { PosProduct } from "../types/pos.types";
import {
  CATALOG_FRESH_MS,
  isCompleteProductList,
  isRecord,
  readSnapshot,
  type CatalogFetcher,
  type CatalogPersistence,
  type CatalogSnapshot,
} from "./catalog-model";

export interface CatalogState {
  products: PosProduct[];
  hasSnapshot: boolean;
  refreshing: boolean;
  updatedAt: number | null;
  error: string | null;
}

export const EMPTY_CATALOG: CatalogState = {
  products: [],
  hasSnapshot: false,
  refreshing: false,
  updatedAt: null,
  error: null,
};

/** One resource per authenticated catalog; requests and complete snapshots are shared. */
export class CatalogResource {
  private state: CatalogState = EMPTY_CATALOG;
  private snapshot: CatalogSnapshot | null = null;
  private listeners = new Set<() => void>();
  private initialized: Promise<void> | null = null;
  private pending: Promise<void> | null = null;
  private controller: AbortController | null = null;
  private revision = 0;
  private persistence = Promise.resolve();

  constructor(
    readonly key: string,
    private fetchCatalog: CatalogFetcher,
    private storage: CatalogPersistence,
    private now: () => number = Date.now,
  ) {}

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(next: Partial<CatalogState>) {
    this.state = { ...this.state, ...next };
    this.listeners.forEach((listener) => listener());
  }
  private persist(action: () => Promise<void>) {
    this.persistence = this.persistence.then(action).catch(() => undefined);
    return this.persistence;
  }

  async start(changedAt = 0) {
    this.initialized ??= this.hydrate();
    await this.initialized;
    const invalidated =
      changedAt > 0 && changedAt >= (this.snapshot?.updatedAt ?? 0);
    await this.refresh(invalidated && !this.pending);
  }

  private async hydrate() {
    const revision = this.revision;
    const saved = await this.storage.read(this.key).catch(() => null);
    if (revision !== this.revision || this.snapshot) return;
    this.snapshot = readSnapshot(saved, this.now());
    if (this.snapshot)
      this.update({
        products: this.snapshot.products,
        hasSnapshot: true,
        updatedAt: this.snapshot.updatedAt,
      });
  }

  refresh(force = false): Promise<void> {
    if (!force && this.pending) return this.pending;
    if (
      !force &&
      this.snapshot &&
      !this.state.error &&
      this.now() - this.snapshot.updatedAt < CATALOG_FRESH_MS
    )
      return Promise.resolve();
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    const revision = ++this.revision;
    this.update({ refreshing: true, error: null });
    const timeout = setTimeout(() => controller.abort(), 20_000);
    const run = async () => {
      try {
        const result = await this.fetchCatalog(
          controller.signal,
          this.snapshot?.etag ?? null,
        );
        if (revision !== this.revision) return;
        if (controller.signal.aborted)
          throw new Error("Барааны мэдээлэл шинэчлэх хугацаа хэтэрлээ.");
        if (result.unchanged && !this.snapshot)
          throw new Error("Барааны бүрэн жагсаалтыг дахин татах шаардлагатай.");
        const products = result.unchanged
          ? this.snapshot!.products
          : result.products;
        if (!isCompleteProductList(products))
          throw new Error(
            "Барааны мэдээлэл дутуу эсвэл буруу ирлээ. Дахин шинэчилнэ үү.",
          );
        const snapshot: CatalogSnapshot = {
          version: 1,
          products,
          count: products.length,
          updatedAt: this.now(),
          etag: result.etag,
        };
        this.snapshot = snapshot;
        this.update({
          products,
          hasSnapshot: true,
          updatedAt: snapshot.updatedAt,
        });
        // Serialize writes so an older response cannot overwrite a newer saved snapshot.
        await this.persist(async () => {
          if (revision === this.revision)
            await this.storage.write(this.key, snapshot);
        });
      } catch (error: unknown) {
        if (revision !== this.revision) return;
        const status = isRecord(error) ? error.status : undefined;
        if (status === 401 || status === 403) {
          this.snapshot = null;
          this.update({ products: [], hasSnapshot: false, updatedAt: null });
          await this.persist(() => this.storage.remove(this.key));
        }
        if (revision !== this.revision) return;
        this.update({
          error: controller.signal.aborted
            ? "Барааны мэдээлэл шинэчлэх хугацаа хэтэрлээ."
            : error instanceof Error
              ? error.message
              : "Бараа шинэчлэхэд алдаа гарлаа.",
        });
      } finally {
        clearTimeout(timeout);
        if (revision === this.revision) {
          this.pending = null;
          this.update({ refreshing: false });
        }
      }
    };
    this.pending = run();
    return this.pending;
  }
}
