import { object, requestJson, type Fetcher } from "../supplier-http";
import type { SupplierCatalog } from "./types";
import { countryCode, records, pageNumber, credential } from "./validation";

export function esimGoCatalog(
  key: string,
  fetcher: Fetcher = fetch,
): SupplierCatalog {
  const apiKey = credential(key);
  return {
    id: "esim-go",
    async fetchPage(country, page = 1) {
      const query = new URLSearchParams({
        countries: countryCode(country),
        page: String(pageNumber(page)),
        perPage: "50",
      });
      const body = await requestJson(
        fetcher,
        `https://api.esim-go.com/v2.5/catalogue?${query}`,
        {
          headers: { "X-API-Key": apiKey, Accept: "application/json" },
        },
      );
      // v2.5 documents an array; some accounts return a bundles envelope.
      const bundles = records(
        Array.isArray(body) ? body : object(body).bundles,
      );
      return {
        supplier: "esim-go",
        records: bundles,
        nextPage: bundles.length === 50 ? page + 1 : null,
      };
    },
  };
}
