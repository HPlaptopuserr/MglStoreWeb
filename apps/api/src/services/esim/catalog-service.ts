import { accessOffers, airaloOffers, type SupplierOffer } from "./offers";
import type { SupplierCatalog, SupplierId } from "./supplier-catalog";
export interface CatalogResult {
  offers: SupplierOffer[];
  suppliers: { id: SupplierId; status: "available" | "unavailable" }[];
  fetchedAt: number;
}
/** Bounded cache + request coalescing. Failed refreshes never serve expired prices. */
export class EsimCatalogService {
  private readonly cache = new Map<
    string,
    { value: CatalogResult; expiresAt: number }
  >();
  private readonly pending = new Map<string, Promise<CatalogResult>>();
  constructor(
    private readonly suppliers: readonly SupplierCatalog[],
    private readonly now = Date.now,
  ) {}
  async list(country: string): Promise<CatalogResult> {
    if (!/^[A-Z]{2}$/.test(country)) throw new Error("Invalid country");
    const cached = this.cache.get(country);
    if (cached && cached.expiresAt > this.now()) return cached.value;
    const pending = this.pending.get(country);
    if (pending) return pending;
    if (this.pending.size >= 8) throw new Error("Catalog capacity reached");
    const request = this.load(country);
    this.pending.set(country, request);
    try {
      const value = await request;
      if (this.cache.size >= 250)
        this.cache.delete(this.cache.keys().next().value ?? "");
      const ttl = value.suppliers.some((s) => s.status === "unavailable")
        ? 30000
        : 300000;
      this.cache.set(country, { value, expiresAt: this.now() + ttl });
      return value;
    } finally {
      this.pending.delete(country);
    }
  }
  private async load(country: string): Promise<CatalogResult> {
    const results = await Promise.allSettled(
      this.suppliers.map(async (supplier) => {
        const records: unknown[] = [];
        let page: number | null = 1;
        let requests = 0;
        while (page !== null && requests++ < 20) {
          const result = await supplier.fetchPage(country, page);
          records.push(...result.records);
          if (result.nextPage !== null && result.nextPage <= page)
            throw new Error("Invalid pagination");
          page = result.nextPage;
        }
        if (page !== null) throw new Error("Incomplete supplier catalog");
        if (supplier.id === "esim-access")
          return accessOffers(records, country);
        if (supplier.id === "airalo") return airaloOffers(records, country);
        throw new Error("Supplier commercial terms not approved");
      }),
    );
    const offers = new Map<string, SupplierOffer>();
    const suppliers = results.map((result, index) => {
      const supplier = this.suppliers[index]!;
      if (result.status === "fulfilled") {
        for (const offer of result.value) {
          if (offers.has(offer.id)) throw new Error("Duplicate supplier offer");
          offers.set(offer.id, offer);
        }
      }
      return {
        id: supplier.id,
        status:
          result.status === "fulfilled"
            ? ("available" as const)
            : ("unavailable" as const),
      };
    });
    return { offers: [...offers.values()], suppliers, fetchedAt: this.now() };
  }
}
