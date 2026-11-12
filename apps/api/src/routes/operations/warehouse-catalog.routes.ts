import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import { hasWarehouseAccess } from "../../services/warehouse-access.service";
import {
  createCatalogTicket,
  verifyCatalogTicket,
  type CatalogDownloadScope,
} from "../../services/warehouse-catalog-ticket";
import {
  createCatalogDocument,
  fetchCatalogItems,
  renderCatalogPdf,
} from "../../services/warehouse-catalog-pdf";

const router: ExpressRouter = Router();
const activeUsers = new Set<string>();

router.post(
  "/warehouses/:id/inventory/catalog-download",
  requireAuth,
  async (req, res) => {
    try {
      const actor = (req as typeof req & { user?: AuthPayload }).user;
      const warehouseId = String(req.params.id);
      if (!actor || !(await hasWarehouseAccess(actor, warehouseId)))
        return res
          .status(403)
          .json({ message: "Энэ агуулахын барааг татах эрхгүй байна." });
      const body = req.body as Record<string, unknown>;
      const status = body.status ?? "all";
      if (
        typeof status !== "string" ||
        !["all", "healthy", "low", "out"].includes(status) ||
        typeof body.search !== "string" ||
        body.search.length > 100 ||
        typeof body.inStockOnly !== "boolean"
      ) {
        return res
          .status(400)
          .json({ message: "Каталогийн хайлт, шүүлтүүр буруу байна." });
      }
      const scope: CatalogDownloadScope = {
        warehouseId,
        userId: actor.userId,
        role: actor.role,
        search: body.search.trim(),
        status: status as CatalogDownloadScope["status"],
        inStockOnly: body.inStockOnly,
      };
      res.setHeader("Cache-Control", "no-store");
      return res.json({ ticket: createCatalogTicket(scope) });
    } catch (error) {
      console.error("create warehouse catalog ticket error", error);
      return res
        .status(503)
        .json({
          message: "Каталогийн таталтыг эхлүүлж чадсангүй. Дахин оролдоно уу.",
        });
    }
  },
);

// A native form POST keeps credentials out of URLs and lets Chrome own the download.
router.post("/warehouses/:id/inventory/catalog.pdf", async (req, res) => {
  const warehouseId = String(req.params.id);
  const body = req.body as Record<string, unknown>;
  let scope: CatalogDownloadScope;
  try {
    if (typeof body.ticket !== "string" || body.ticket.length > 8192)
      throw new Error("Missing ticket");
    scope = verifyCatalogTicket(body.ticket, warehouseId);
  } catch {
    return res
      .status(401)
      .send(
        "Таталтын эрхийн хугацаа дууссан. Агуулахын хуудаснаас дахин татна уу.",
      );
  }
  if (activeUsers.has(scope.userId) || activeUsers.size >= 3)
    return res
      .status(429)
      .send(
        "Каталог бэлтгэж байна. Одоогийн таталт дууссаны дараа дахин оролдоно уу.",
      );
  activeUsers.add(scope.userId);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10 * 60_000);
  const onClose = () => {
    if (!res.writableFinished) controller.abort();
  };
  res.on("close", onClose);
  let doc: PDFKit.PDFDocument | undefined;
  try {
    if (!(await hasWarehouseAccess(scope, warehouseId)))
      return res.status(403).send("Агуулахын барааг татах эрхгүй байна.");
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: { name: true },
    });
    if (!warehouse) return res.status(404).send("Агуулах олдсонгүй.");
    doc = createCatalogDocument();
    doc.on("error", (error: Error) => {
      controller.abort();
      res.destroy(error);
    });
    const date = new Date().toLocaleDateString("sv-SE", {
      timeZone: "Asia/Ulaanbaatar",
    });
    const filename = `${warehouse.name.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 60)}-catalog-${date}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="warehouse-catalog-${date}.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    doc.pipe(res);
    const items = await fetchCatalogItems(scope);
    controller.signal.throwIfAborted();
    const statusLabels = {
      all: "Бүгд",
      healthy: "Хэвийн",
      low: "Дутагдал",
      out: "Дууссан",
    };
    await renderCatalogPdf({
      document: doc,
      items,
      warehouseName: warehouse.name,
      scopeLabel: [
        scope.inStockOnly ? "Зөвхөн нөөцтэй бараа" : "Бүх идэвхтэй бараа",
        `Төлөв: ${statusLabels[scope.status]}`,
        scope.search ? `Хайлт: ${scope.search}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
      signal: controller.signal,
    });
    doc.end();
  } catch (error) {
    if (!controller.signal.aborted)
      console.error("stream warehouse catalog error", error);
    doc?.destroy();
    if (res.headersSent)
      res.destroy(error instanceof Error ? error : undefined);
    else res.status(503).send("Каталог бэлтгэж чадсангүй. Дахин оролдоно уу.");
  } finally {
    clearTimeout(timer);
    res.off("close", onClose);
    activeUsers.delete(scope.userId);
  }
});

export default router;
