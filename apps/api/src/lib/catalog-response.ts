import { createHash } from "node:crypto";
import type { Request, Response } from "express";

/** Authorization must complete before returning either a catalog or its 304. */
export function sendCatalogResponse(
  req: Request,
  res: Response,
  products: readonly unknown[],
) {
  const body = JSON.stringify(products);
  const etag = `"${createHash("sha256").update(body).digest("base64url")}"`;
  res.setHeader("Cache-Control", "private, no-cache");
  res.vary("Authorization");
  res.vary("Cookie");
  res.setHeader("ETag", etag);
  res.setHeader("X-MGL-Catalog-Count", products.length);
  if (req.get("If-None-Match") === etag) return res.status(304).end();
  return res.status(200).type("json").send(body);
}
