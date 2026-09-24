import crypto from "node:crypto";
import { Router, type Router as ExpressRouter } from "express";
import { PosSaleStatus, prisma } from "@mgl/database";
import {
  calculateCafeRemaining,
  calculateCafeTotals,
  parseCafeBusinessDate,
  roundCafeQuantity,
  sumCafeReceivedQuantities,
} from "./cafe-daily-stock";
import {
  canAccessPosOrganization,
  requirePosUser,
  type AuthUser,
} from "./_shared";

const router: ExpressRouter = Router();
const MAX_QTY = 1_000_000;

type DailyStockInput = {
  productId: string;
  openingQty: number;
  wasteQty: number;
  note: string | null;
};

type ReceiptInput = {
  productId: string;
  quantity: number;
};

const normalizeQty = (value: unknown) => {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity < 0 || quantity > MAX_QTY) {
    return null;
  }
  return roundCafeQuantity(quantity);
};

const parseDailyStockItems = (value: unknown): DailyStockInput[] | null => {
  if (!Array.isArray(value) || value.length > 500) return null;
  const productIds = new Set<string>();
  const items: DailyStockInput[] = [];

  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const source = raw as Record<string, unknown>;
    const productId = String(source.productId ?? "").trim();
    const openingQty = normalizeQty(source.openingQty);
    const wasteQty = normalizeQty(source.wasteQty);
    const note = String(source.note ?? "").trim().slice(0, 500) || null;
    if (
      !productId ||
      productIds.has(productId) ||
      openingQty === null ||
      wasteQty === null
    ) {
      return null;
    }
    productIds.add(productId);
    items.push({ productId, openingQty, wasteQty, note });
  }
  return items;
};

const parseReceiptItems = (value: unknown): ReceiptInput[] | null => {
  if (!Array.isArray(value) || value.length === 0 || value.length > 500) {
    return null;
  }
  const productIds = new Set<string>();
  const items: ReceiptInput[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const source = raw as Record<string, unknown>;
    const productId = String(source.productId ?? "").trim();
    const quantity = normalizeQty(source.quantity);
    if (
      !productId ||
      productIds.has(productId) ||
      quantity === null ||
      quantity <= 0
    ) {
      return null;
    }
    productIds.add(productId);
    items.push({ productId, quantity });
  }
  return items;
};

async function resolveCafeBranch(
  actor: AuthUser,
  branchId: string,
) {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, deletedAt: null },
    select: { id: true, name: true, organizationId: true },
  });
  if (!branch || !canAccessPosOrganization(actor, branch.organizationId)) {
    return null;
  }
  const setting = await prisma.siteSetting.findUnique({
    where: { key: `self-service-mode-${branch.organizationId}` },
    select: { value: true },
  });
  if (String(setting?.value ?? "").trim().toUpperCase() !== "CAFE") {
    return null;
  }
  return branch;
}

async function buildDailyStockResponse(input: {
  branch: { id: string; name: string; organizationId: string };
  date: NonNullable<ReturnType<typeof parseCafeBusinessDate>>;
}) {
  const { branch, date } = input;
  const [products, entries, categories, soldGroups, receivedGroups, receipts] = await Promise.all([
    prisma.product.findMany({
      where: {
        organizationId: branch.organizationId,
        isRestaurantMenuItem: true,
        deletedAt: null,
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        isActive: true,
        menuCategory: true,
        images: { take: 1, select: { url: true } },
      },
    }),
    prisma.cafeDailyStock.findMany({
      where: { branchId: branch.id, businessDate: date.databaseDate },
    }),
    prisma.restaurantMenuCategory.findMany({
      where: { organizationId: branch.organizationId },
      select: { code: true, name: true },
    }),
    prisma.posSaleLine.groupBy({
      by: ["productId"],
      where: {
        sale: {
          is: {
            organizationId: branch.organizationId,
            branchId: branch.id,
            status: PosSaleStatus.COMPLETED,
            createdAt: { gte: date.startUtc, lt: date.endUtc },
          },
        },
      },
      _sum: { qty: true },
    }),
    prisma.cafeDailyStockReceipt.groupBy({
      by: ["productId"],
      where: {
        branchId: branch.id,
        businessDate: date.databaseDate,
        voidedAt: null,
      },
      _sum: { quantity: true },
    }),
    prisma.cafeDailyStockReceipt.findMany({
      where: { branchId: branch.id, businessDate: date.databaseDate },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        batchId: true,
        productId: true,
        quantity: true,
        note: true,
        createdAt: true,
        voidedAt: true,
        product: { select: { name: true, unit: true } },
        receivedBy: {
          select: { email: true, profile: { select: { fullName: true } } },
        },
        voidedBy: {
          select: { email: true, profile: { select: { fullName: true } } },
        },
      },
    }),
  ]);

  const entryByProduct = new Map(entries.map((entry) => [entry.productId, entry]));
  const soldByProduct = new Map(
    soldGroups.map((group) => [group.productId, Number(group._sum.qty ?? 0)]),
  );
  const receivedByProduct = sumCafeReceivedQuantities(
    receivedGroups.map((group) => ({
      productId: group.productId,
      quantity: Number(group._sum.quantity ?? 0),
    })),
  );
  const categoryByCode = new Map(
    categories.map((category) => [category.code, category.name]),
  );
  const items = products.map((product) => {
    const entry = entryByProduct.get(product.id);
    const openingQty = Number(entry?.openingQty ?? 0);
    const receivedQty = receivedByProduct.get(product.id) ?? 0;
    const soldQty = roundCafeQuantity(soldByProduct.get(product.id) ?? 0);
    const wasteQty = Number(entry?.wasteQty ?? 0);
    return {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      unit: product.unit || "ш",
      imageUrl: product.images[0]?.url ?? null,
      isActive: product.isActive,
      menuCategory: product.menuCategory,
      categoryName: product.menuCategory
        ? categoryByCode.get(product.menuCategory) ?? product.menuCategory
        : "Ангилалгүй",
      openingQty,
      receivedQty,
      soldQty,
      wasteQty,
      remainingQty: calculateCafeRemaining({
        openingQty,
        receivedQty,
        soldQty,
        wasteQty,
      }),
      note: entry?.note ?? "",
      updatedAt: entry?.updatedAt.toISOString() ?? null,
    };
  });

  return {
    date: date.dateKey,
    branch: { id: branch.id, name: branch.name },
    totals: calculateCafeTotals(items),
    negativeCount: items.filter((item) => item.remainingQty < 0).length,
    items,
    receipts: receipts.map((receipt) => ({
      id: receipt.id,
      batchId: receipt.batchId,
      productId: receipt.productId,
      productName: receipt.product.name,
      unit: receipt.product.unit || "ш",
      quantity: Number(receipt.quantity),
      note: receipt.note ?? "",
      createdAt: receipt.createdAt.toISOString(),
      receivedBy:
        receipt.receivedBy?.profile?.fullName ||
        receipt.receivedBy?.email ||
        "Систем",
      voidedAt: receipt.voidedAt?.toISOString() ?? null,
      voidedBy:
        receipt.voidedBy?.profile?.fullName || receipt.voidedBy?.email || null,
    })),
  };
}

router.get("/restaurant/pos/cafe-daily-stock", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;
    const branchId = String(req.query.branchId ?? "").trim();
    const date = parseCafeBusinessDate(req.query.date);
    if (!branchId || !date) {
      return res.status(400).json({ message: "Салбар болон зөв огноо сонгоно уу" });
    }
    const branch = await resolveCafeBranch(actor, branchId);
    if (!branch) {
      return res.status(403).json({
        message: "Кофе шопын өдрийн барааны бүртгэл ашиглах эрхгүй байна",
      });
    }
    return res.json(await buildDailyStockResponse({ branch, date }));
  } catch (error) {
    console.error("Cafe daily stock read error", error);
    return res.status(500).json({
      message: "Өдрийн барааны мэдээлэл авахад алдаа гарлаа",
    });
  }
});

router.put("/restaurant/pos/cafe-daily-stock", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;
    const branchId = String(req.body?.branchId ?? "").trim();
    const date = parseCafeBusinessDate(req.body?.date);
    const items = parseDailyStockItems(req.body?.items);
    if (!branchId || !date || !items) {
      return res.status(400).json({
        message: "Өдрийн барааны мэдээлэл буруу байна",
      });
    }
    const branch = await resolveCafeBranch(actor, branchId);
    if (!branch) {
      return res.status(403).json({
        message: "Кофе шопын өдрийн барааны бүртгэл засах эрхгүй байна",
      });
    }

    const productIds = items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        organizationId: branch.organizationId,
        isRestaurantMenuItem: true,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (products.length !== productIds.length) {
      return res.status(400).json({
        message: "Зарим бүтээгдэхүүн кофе шопын менюд байхгүй байна",
      });
    }

    await prisma.$transaction(
      items.map((item) => {
        const empty =
          item.openingQty === 0 &&
          item.wasteQty === 0 &&
          !item.note;
        if (empty) {
          return prisma.cafeDailyStock.deleteMany({
            where: {
              branchId: branch.id,
              productId: item.productId,
              businessDate: date.databaseDate,
            },
          });
        }
        return prisma.cafeDailyStock.upsert({
          where: {
            branchId_productId_businessDate: {
              branchId: branch.id,
              productId: item.productId,
              businessDate: date.databaseDate,
            },
          },
          create: {
            organizationId: branch.organizationId,
            branchId: branch.id,
            productId: item.productId,
            businessDate: date.databaseDate,
            openingQty: item.openingQty,
            wasteQty: item.wasteQty,
            note: item.note,
            createdById: actor.id,
            updatedById: actor.id,
          },
          update: {
            openingQty: item.openingQty,
            wasteQty: item.wasteQty,
            note: item.note,
            updatedById: actor.id,
          },
        });
      }),
    );

    return res.json(await buildDailyStockResponse({ branch, date }));
  } catch (error) {
    console.error("Cafe daily stock save error", error);
    return res.status(500).json({
      message: "Өдрийн барааны мэдээлэл хадгалахад алдаа гарлаа",
    });
  }
});

router.post("/restaurant/pos/cafe-daily-stock/receipts", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;
    const branchId = String(req.body?.branchId ?? "").trim();
    const date = parseCafeBusinessDate(req.body?.date);
    const items = parseReceiptItems(req.body?.items);
    const note = String(req.body?.note ?? "").trim().slice(0, 500) || null;
    if (!branchId || !date || !items) {
      return res.status(400).json({ message: "Барааны орлогын мэдээлэл буруу байна" });
    }
    const branch = await resolveCafeBranch(actor, branchId);
    if (!branch) {
      return res.status(403).json({
        message: "Кофе шопын бараа орлогодох эрхгүй байна",
      });
    }
    const productIds = items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        organizationId: branch.organizationId,
        isRestaurantMenuItem: true,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (products.length !== productIds.length) {
      return res.status(400).json({
        message: "Зарим бүтээгдэхүүн кофе шопын менюд байхгүй байна",
      });
    }

    const batchId = crypto.randomUUID();
    await prisma.$transaction(
      items.map((item) =>
        prisma.cafeDailyStockReceipt.create({
          data: {
            batchId,
            organizationId: branch.organizationId,
            branchId: branch.id,
            productId: item.productId,
            businessDate: date.databaseDate,
            quantity: item.quantity,
            note,
            receivedById: actor.id,
          },
        }),
      ),
    );

    return res.status(201).json(
      await buildDailyStockResponse({ branch, date }),
    );
  } catch (error) {
    console.error("Cafe daily stock receipt error", error);
    return res.status(500).json({ message: "Бараа орлогодоход алдаа гарлаа" });
  }
});

router.delete(
  "/restaurant/pos/cafe-daily-stock/receipts/:receiptId",
  async (req, res) => {
    try {
      const actor = await requirePosUser(req, res);
      if (!actor) return;
      const receiptId = String(req.params.receiptId ?? "").trim();
      const receipt = await prisma.cafeDailyStockReceipt.findUnique({
        where: { id: receiptId },
        select: {
          id: true,
          branchId: true,
          businessDate: true,
          voidedAt: true,
        },
      });
      if (!receipt) {
        return res.status(404).json({ message: "Орлогын бүртгэл олдсонгүй" });
      }
      const branch = await resolveCafeBranch(actor, receipt.branchId);
      if (!branch) {
        return res.status(403).json({ message: "Орлогын бүртгэл цуцлах эрхгүй байна" });
      }
      if (!receipt.voidedAt) {
        await prisma.cafeDailyStockReceipt.update({
          where: { id: receipt.id },
          data: { voidedAt: new Date(), voidedById: actor.id },
        });
      }
      const date = parseCafeBusinessDate(
        receipt.businessDate.toISOString().slice(0, 10),
      );
      if (!date) {
        return res.status(500).json({ message: "Орлогын огноо буруу байна" });
      }
      return res.json(await buildDailyStockResponse({ branch, date }));
    } catch (error) {
      console.error("Cafe daily stock receipt void error", error);
      return res.status(500).json({ message: "Орлогын бүртгэл цуцлахад алдаа гарлаа" });
    }
  },
);

export default router;
