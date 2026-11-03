import "../config/env";
import { prisma } from "@mgl/database";
import { separateVendorCatalog, rollbackVendorSeparation } from "../services/warehouse-catalog/separate-vendor";

async function main() {
  const host = new URL(process.env.DATABASE_URL ?? "http://disabled").hostname;
  if (!["127.0.0.1", "localhost", "[::1]"].includes(host)) throw new Error("Local database only; production execution is disabled");
  const [organizationId, mode, expectedFingerprint] = process.argv.slice(2);
  if (mode === "--apply") {
    throw new Error("Legacy stock-moving separation is disabled. Use split-catalog-local.ts to preserve vendor and warehouse quantities independently.");
  }
  if (organizationId === "--preview-all") {
    const products = await prisma.product.findMany({
      where: { organizationId: { not: null }, OR: [
        { managedByWarehouseId: { not: null } },
        { warehouseInventories: { some: { warehouse: { type: "CENTRAL" } } } },
      ] }, select: { organizationId: true }, distinct: ["organizationId"],
    });
    const reports = [];
    for (const product of products) {
      if (product.organizationId) reports.push(await separateVendorCatalog({ organizationId: product.organizationId }));
    }
    console.log(JSON.stringify(reports, null, 2));
    return;
  }
  if (organizationId === "--rollback") {
    if (!mode || expectedFingerprint) throw new Error("Usage: --rollback <auditId>");
    console.log(JSON.stringify(await rollbackVendorSeparation(mode), null, 2));
    return;
  }
  if (!organizationId || (mode && mode !== "--apply")) throw new Error("Usage: <organizationId> [--apply <preview fingerprint>]");
  console.log(JSON.stringify(await separateVendorCatalog({ organizationId, apply: false, expectedFingerprint }), null, 2));
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Separation failed"); process.exitCode = 1; }).finally(() => prisma.$disconnect());
