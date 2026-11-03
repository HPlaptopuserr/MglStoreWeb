import "../config/env";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import { vendorProductReadScope } from "../services/warehouse-product-scope";

const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Unexpected API response");
  return value as Record<string, unknown>;
};
async function main() {
  if (!["127.0.0.1", "localhost"].includes(new URL(process.env.DATABASE_URL ?? "http://disabled").hostname)) throw new Error("Local database only");
  const email = process.argv[2];
  if (!email) throw new Error("User email required");
  const user = await prisma.user.findUniqueOrThrow({ where: { email }, select: {
    id: true, email: true, role: true,
    warehouseSetupTokens: { where: { usedAt: { not: null } }, select: { warehouse: { select: { id: true, name: true } } } },
    organizationMemberships: { select: { organizationId: true, role: true, organization: { select: { name: true } } } },
  } });
  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || "dev-secret-change-me", { expiresIn: "5m" });
  const read = async (path: string): Promise<unknown> => {
    const response = await fetch(`http://localhost:4000/api${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return response.json();
  };
  for (const { warehouse } of user.warehouseSetupTokens) {
    const result = object(await read(`/warehouses/${warehouse.id}/inventory?limit=100`));
    const expected = await prisma.warehouseInventory.count({ where: { warehouseId: warehouse.id, product: { deletedAt: null } } });
    const actual = object(result.pagination).total;
    if (actual !== expected) throw new Error(`${warehouse.name}: expected ${expected}, received ${String(actual)}`);
    console.log(JSON.stringify({ portal: "warehouse", warehouse: warehouse.name, expected, actual, passed: true }));
  }
  for (const membership of user.organizationMemberships) {
    const ids: string[] = [];
    for (let offset = 0; ; offset += 100) {
      const response = await read(`/products?organizationId=${membership.organizationId}&includeInactive=true&includeMeta=true&limit=100&offset=${offset}`);
      const body = Array.isArray(response) ? response : object(response).products;
      if (!Array.isArray(body)) throw new Error("Missing product array");
      const pageIds = body.map(row => object(row).id).filter((id): id is string => typeof id === "string");
      if (pageIds.some(id => ids.includes(id))) throw new Error("Pagination repeated products");
      ids.push(...pageIds);
      if (pageIds.length < 100) break;
    }
    const leaks = await prisma.product.count({ where: { id: { in: ids }, OR: [
      { organizationId: { not: membership.organizationId } },
      { managedByWarehouseId: { not: null } },
      { warehouseInventories: { some: { warehouse: { type: "CENTRAL" } } } },
    ] } });
    const ownCount = await prisma.product.count({ where: { organizationId: membership.organizationId, deletedAt: null, ...vendorProductReadScope() } });
    if (leaks) throw new Error(`${membership.organization.name}: ${leaks} foreign/warehouse products leaked`);
    console.log(JSON.stringify({ portal: "vendor", organization: membership.organization.name, returned: ids.length, ownCatalogCount: ownCount, foreignOrWarehouseProducts: leaks, passed: true }));
  }
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Verification failed"); process.exitCode = 1; }).finally(() => prisma.$disconnect());
