import { object, requestJson, type Fetcher } from "../supplier-http";
import type { SupplierCatalog } from "./types";
import { countryCode, records, pageNumber, credential } from "./validation";

export function esimAccessCatalog(
  key: string,
  fetcher: Fetcher = fetch,
): SupplierCatalog {
  const accessCode = credential(key);
  return {
    id: "esim-access",
    async fetchPage(country, page = 1) {
      if (pageNumber(page) !== 1)
        throw new Error("eSIM Access catalog is not paginated");
      const body = object(
        await requestJson(
          fetcher,
          "https://api.esimaccess.com/api/v1/open/package/list",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "RT-AccessCode": accessCode,
            },
            body: JSON.stringify({
              locationCode: countryCode(country),
              type: "BASE",
            }),
          },
        ),
      );
      if (body.success !== true)
        throw new Error("eSIM Access rejected catalog request");
      return {
        supplier: "esim-access",
        records: records(object(body.obj).packageList),
        nextPage: null,
      };
    },
  };
}
