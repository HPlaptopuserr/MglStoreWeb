import "../../config/env";
import express from "express";
import { prisma } from "@mgl/database";
import { createVisualSearchRouter } from "../../routes/catalog/visual-search.routes";
import { createCatalogImageSearcher } from "../../services/visual-search/visual-search-service";
import {
  currentVisualIndex,
  visualSearchReadiness,
} from "../../services/visual-search/visual-search-snapshot";
import { encodeSearchImage } from "../../services/visual-search/visual-search-encoder";
import { loadPreviewProducts } from "./public-catalog";

async function start() {
  if (!process.env.VISUAL_SEARCH_CACHE_DIR?.includes("public-catalog-preview"))
    throw new Error("A separate public-catalog-preview cache is required");
  if (!(await visualSearchReadiness()).ready)
    throw new Error("Build the public preview index first");
  const app = express();
  app.disable("x-powered-by");
  app.use(
    "/api",
    createVisualSearchRouter(
      createCatalogImageSearcher({
        index: currentVisualIndex,
        encode: encodeSearchImage,
        load: loadPreviewProducts,
        project: loadPreviewProducts,
      }),
      () => true,
      visualSearchReadiness,
    ),
  );
  app.use((_req, res) =>
    res.status(404).json({ message: "Image-search preview only" }),
  );
  const server = app.listen(4001, "127.0.0.1", () =>
    console.log("Public-catalog image search ready at 127.0.0.1:4001"),
  );
  const close = () =>
    server.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
  process.once("SIGTERM", close);
  process.once("SIGINT", close);
}
start().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Preview startup failed",
  );
  process.exitCode = 1;
});
