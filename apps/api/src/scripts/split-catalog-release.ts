import "../config/env";
import { prisma } from "@mgl/database";
import { splitVendorWarehouseCatalog } from "../services/warehouse-catalog/split-catalog";

async function main() {
  const [mode, organizationId, expectedFingerprint] = process.argv.slice(2);
  if (mode === "--preview-all") {
    const candidates = await prisma.product.findMany({
      where: { organizationId: { not: null }, OR: [
        { managedByWarehouseId: { not: null } },
        { warehouseInventories: { some: { warehouse: { type: "CENTRAL" } } } },
      ] }, select: { organizationId: true }, distinct: ["organizationId"],
    });
    for (const candidate of candidates) if (candidate.organizationId)
      console.log(JSON.stringify(await splitVendorWarehouseCatalog({ organizationId: candidate.organizationId })));
    return;
  }
  if (!["--apply", "--rehearse"].includes(mode ?? "") || !organizationId || !expectedFingerprint)
    throw new Error("Usage: --preview-all | --rehearse <organizationId> <fingerprint> | --apply <organizationId> <fingerprint>");
  try {
    console.log(JSON.stringify(await splitVendorWarehouseCatalog({
      organizationId, expectedFingerprint, apply: true, rollbackAfterValidation: mode === "--rehearse",
    })));
  } catch (error: unknown) {
    if (mode === "--rehearse" && error instanceof Error && error.message === "CATALOG_REHEARSAL_PASSED_ROLLED_BACK") {
      console.log(JSON.stringify({ organizationId, rehearsalPassed: true, rolledBack: true }));
      return;
    }
    throw error;
  }
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Catalog separation failed");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
