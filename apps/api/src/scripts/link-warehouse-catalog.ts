import "../config/env";
import { prisma } from "@mgl/database";
import { linkWarehouseCatalog } from "../services/warehouse-catalog/link";

const [warehouseId, organizationId, mode] = process.argv.slice(2);
if (!warehouseId || !organizationId || (mode && mode !== "--apply")) {
  console.error(
    "Usage: tsx src/scripts/link-warehouse-catalog.ts <warehouseId> <organizationId> [--apply]",
  );
  process.exitCode = 1;
} else {
  linkWarehouseCatalog({
    warehouseId,
    organizationId,
    apply: mode === "--apply",
  })
    .then((report) => console.log(JSON.stringify(report, null, 2)))
    .catch((error: unknown) => {
      console.error(
        error instanceof Error ? error.message : "Catalog linking failed",
      );
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
