export type SupplierId = "esim-access" | "esim-go" | "airalo";
export interface CatalogPage {
  readonly supplier: SupplierId;
  readonly records: readonly unknown[];
  readonly nextPage: number | null;
}
export interface SupplierCatalog {
  readonly id: SupplierId;
  fetchPage(country: string, page?: number): Promise<CatalogPage>;
}
