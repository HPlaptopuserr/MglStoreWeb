import { createHmac } from "node:crypto";
import jwt from "jsonwebtoken";

export interface CatalogDownloadScope {
  warehouseId: string;
  userId: string;
  role: string;
  search: string;
  status: "all" | "healthy" | "low" | "out";
  inStockOnly: boolean;
}

function ticketKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === "production")
    throw new Error("JWT_SECRET is required");
  // Download tickets must never be accepted as ordinary API login tokens.
  return createHmac("sha256", secret || "dev-secret-change-me")
    .update("warehouse-catalog-download-v1")
    .digest();
}

export function createCatalogTicket(scope: CatalogDownloadScope): string {
  return jwt.sign(scope, ticketKey(), {
    expiresIn: "2m",
    audience: "warehouse-catalog",
    algorithm: "HS256",
  });
}

export function verifyCatalogTicket(
  ticket: string,
  warehouseId: string,
): CatalogDownloadScope {
  const value = jwt.verify(ticket, ticketKey(), {
    audience: "warehouse-catalog",
    algorithms: ["HS256"],
  });
  if (
    typeof value === "string" ||
    value.warehouseId !== warehouseId ||
    typeof value.userId !== "string" ||
    typeof value.role !== "string" ||
    typeof value.search !== "string" ||
    value.search.length > 100 ||
    !["all", "healthy", "low", "out"].includes(value.status) ||
    typeof value.inStockOnly !== "boolean"
  )
    throw new Error("Invalid download ticket");
  return value as CatalogDownloadScope;
}
