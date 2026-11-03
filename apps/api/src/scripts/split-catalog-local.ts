import "../config/env";
import { prisma } from "@mgl/database";
import { splitVendorWarehouseCatalog } from "../services/warehouse-catalog/split-catalog";
async function main() {
  if (!["127.0.0.1", "localhost"].includes(new URL(process.env.DATABASE_URL ?? "http://disabled").hostname)) throw new Error("Local database only");
  const [organizationId, mode, expectedFingerprint] = process.argv.slice(2);
  if (!organizationId || (mode && mode !== "--apply")) throw new Error("Usage: <organizationId|--preview-all> [--apply <fingerprint>]");
  if (organizationId === "--preview-all") {
    if (mode) throw new Error("Bulk apply is disabled");
    const products = await prisma.product.findMany({ where: { organizationId: { not: null }, OR: [{ managedByWarehouseId: { not: null } }, { warehouseInventories: { some: { warehouse: { type: "CENTRAL" } } } }] }, select: { organizationId: true }, distinct: ["organizationId"] });
    for (const product of products) if (product.organizationId) console.log(JSON.stringify(await splitVendorWarehouseCatalog({ organizationId: product.organizationId })));
    return;
  }
  console.log(JSON.stringify(await splitVendorWarehouseCatalog({ organizationId, apply: mode === "--apply", expectedFingerprint }), null, 2));
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Split failed"); process.exitCode = 1; }).finally(() => prisma.$disconnect());
