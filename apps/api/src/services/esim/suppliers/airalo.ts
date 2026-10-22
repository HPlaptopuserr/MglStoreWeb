import { object, requestJson, type Fetcher } from "../supplier-http";
import type { SupplierCatalog } from "./types";
import { countryCode, records, pageNumber, credential } from "./validation";

export function airaloCatalog(
  clientId: string,
  clientSecret: string,
  fetcher: Fetcher = fetch,
): SupplierCatalog {
  const id = credential(clientId);
  const secret = credential(clientSecret);
  let token: string | undefined;
  let expiresAt = 0;
  let pendingToken: Promise<string> | undefined;
  async function accessToken(): Promise<string> {
    if (token && Date.now() < expiresAt) return token;
    if (pendingToken) return pendingToken;
    pendingToken = (async () => {
      const body = object(
        await requestJson(fetcher, "https://partners-api.airalo.com/v2/token", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: id,
            client_secret: secret,
            grant_type: "client_credentials",
          }),
        }),
      );
      const data = object(body.data);
      if (typeof data.access_token !== "string" || !data.access_token)
        throw new Error("Invalid Airalo token response");
      const seconds =
        typeof data.expires_in === "number" && Number.isFinite(data.expires_in)
          ? Math.max(0, Math.min(data.expires_in, 86400) - 60)
          : 0;
      token = data.access_token;
      expiresAt = Date.now() + seconds * 1000;
      return token;
    })();
    try {
      return await pendingToken;
    } finally {
      pendingToken = undefined;
    }
  }
  return {
    id: "airalo",
    async fetchPage(country, page = 1) {
      const query = new URLSearchParams({
        "filter[country]": countryCode(country),
        page: String(pageNumber(page)),
        limit: "50",
      });
      const bearer = await accessToken();
      const body = object(
        await requestJson(
          fetcher,
          `https://partners-api.airalo.com/v2/packages?${query}`,
          {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${bearer}`,
              "Accept-Language": "en",
            },
          },
        ),
      );
      const next = body.links === undefined ? null : object(body.links).next;
      // Do not follow supplier-provided URLs with our credentials.
      return {
        supplier: "airalo",
        records: records(body.data),
        nextPage: typeof next === "string" && next.length > 0 ? page + 1 : null,
      };
    },
  };
}
