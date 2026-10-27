import "../config/env";
import { prisma } from "@mgl/database";
import { readIndex } from "../services/visual-search/visual-search-index";
import { importVisualSnapshot } from "../services/visual-search/visual-search-store";

async function main() {
  console.log(JSON.stringify(await importVisualSnapshot(await readIndex())));
}
main()
  .catch((error: unknown) => {
    console.error("Visual index import failed", {
      reason: error instanceof Error ? error.name : "UnknownError",
    });
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
