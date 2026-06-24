import crypto from "crypto";
import { Router, type Router as ExpressRouter } from "express";
import {
  KitchenTicketStatus,
  prisma,
  RestaurantOrderMode,
  RestaurantTicketStatus,
  ShiftStatus,
} from "@mgl/database";
import type { Prisma } from "@mgl/database";
import { hasOrgMembership } from "../../../services/permission.service";
import { requirePosUser, type AuthUser } from "./_shared";

const router: ExpressRouter = Router();

const EDITABLE_TICKET_STATUSES: RestaurantTicketStatus[] = [
  RestaurantTicketStatus.OPEN,
  RestaurantTicketStatus.KITCHEN,
  RestaurantTicketStatus.READY,
  RestaurantTicketStatus.SERVED,
];

const OCCUPIED_TICKET_STATUSES: RestaurantTicketStatus[] = [
  ...EDITABLE_TICKET_STATUSES,
  RestaurantTicketStatus.PAID,
];

const ACTIVE_KITCHEN_TICKET_STATUSES: KitchenTicketStatus[] = [
  KitchenTicketStatus.NEW,
  KitchenTicketStatus.PREPARING,
  KitchenTicketStatus.READY,
];

const TABLE_QR_TOKEN_BYTES = 24;

const DEFAULT_TABLES = [
  { code: "A1", label: "A1", zone: "Гол заал", seats: 4, sortOrder: 10 },
  { code: "A2", label: "A2", zone: "Гол заал", seats: 2, sortOrder: 20 },
  { code: "A3", label: "A3", zone: "Гол заал", seats: 6, sortOrder: 30 },
  { code: "A4", label: "A4", zone: "Цонхны тал", seats: 4, sortOrder: 40 },
  { code: "T1", label: "T1", zone: "Террас", seats: 4, sortOrder: 50 },
  { code: "VIP", label: "VIP", zone: "VIP", seats: 8, sortOrder: 60 },
];

type TicketLineInput = {
  productId?: string;
  qty?: number;
  note?: string;
};

const generateNumber = (prefix: string) => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = `${Date.now().toString().slice(-6)}${crypto
    .randomBytes(2)
    .toString("hex")
    .toUpperCase()}`;
  return `${prefix}-${date}-${suffix}`;
};

const generateTableQrToken = () =>
  crypto.randomBytes(TABLE_QR_TOKEN_BYTES).toString("base64url");

const normalizeOrderMode = (value: unknown): RestaurantOrderMode => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (normalized === RestaurantOrderMode.TO_GO)
    return RestaurantOrderMode.TO_GO;
  if (normalized === RestaurantOrderMode.DELIVERY) {
    return RestaurantOrderMode.DELIVERY;
  }
  return RestaurantOrderMode.DINE_IN;
};

const normalizeNote = (value: unknown) => {
  const note = String(value ?? "")
    .trim()
    .slice(0, 500);
  return note || null;
};

const normalizeQrCustomerNote = (value: unknown) => {
  const note = normalizeNote(value);
  return note ? `QR: ${note}` : "QR self-order";
};

async function ensureTableQrToken(
  tx: Prisma.TransactionClient,
  tableId: string,
) {
  const existing = await tx.restaurantTable.findUnique({
    where: { id: tableId },
    select: { qrToken: true },
  });
  if (!existing) return null;
  if (existing.qrToken) return existing.qrToken;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const updated = await tx.restaurantTable.update({
        where: { id: tableId },
        data: { qrToken: generateTableQrToken() },
        select: { qrToken: true },
      });
      return updated.qrToken;
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }

  return null;
}

async function requireBranchAccess(actor: AuthUser, branchId: string) {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, deletedAt: null },
    select: { id: true, organizationId: true, name: true },
  });
  if (!branch) {
    return { error: { status: 404, message: "Салбар олдсонгүй" } } as const;
  }

  if (
    actor.role !== "ADMIN" &&
    !(await hasOrgMembership(actor.id, branch.organizationId))
  ) {
    return {
      error: {
        status: 403,
        message: "Энэ салбарын ресторан касс ашиглах эрхгүй",
      },
    } as const;
  }

  return { branch } as const;
}

const ticketInclude = {
  table: {
    select: { id: true, code: true, label: true, zone: true, seats: true },
  },
  items: {
    orderBy: { createdAt: "asc" as const },
  },
  kitchenTickets: {
    orderBy: { sentAt: "desc" as const },
    take: 5,
    include: {
      items: { orderBy: { createdAt: "asc" as const } },
    },
  },
};

const kitchenTicketInclude = {
  restaurantTicket: {
    select: {
      id: true,
      ticketNo: true,
      orderMode: true,
      status: true,
      table: {
        select: { id: true, code: true, label: true, zone: true },
      },
    },
  },
  items: {
    orderBy: { createdAt: "asc" as const },
  },
};

type TicketWithDetails = Prisma.RestaurantTicketGetPayload<{
  include: typeof ticketInclude;
}>;

type KitchenTicketWithDetails = Prisma.KitchenTicketGetPayload<{
  include: typeof kitchenTicketInclude;
}>;

function mapTicket(ticket: TicketWithDetails) {
  const items = ticket.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    name: item.productName,
    price: Number(item.unitPrice),
    qty: item.qty,
    sentQty: item.sentQty,
    note: item.note || "",
    kitchenStation: item.kitchenStation,
    preparationMinutes: item.preparationMinutes,
  }));

  return {
    id: ticket.id,
    ticketNo: ticket.ticketNo,
    organizationId: ticket.organizationId,
    branchId: ticket.branchId,
    shiftId: ticket.shiftId,
    tableId: ticket.tableId,
    orderMode: ticket.orderMode,
    status: ticket.status,
    guestCount: ticket.guestCount,
    note: ticket.note,
    openedAt: ticket.openedAt.toISOString(),
    sentAt: ticket.sentAt?.toISOString() ?? null,
    closedAt: ticket.closedAt?.toISOString() ?? null,
    total: items.reduce((sum, item) => sum + item.price * item.qty, 0),
    unsentCount: items.reduce(
      (sum, item) => sum + Math.max(0, item.qty - item.sentQty),
      0,
    ),
    table: ticket.table,
    items,
    kitchenTickets: ticket.kitchenTickets.map((kitchenTicket) => ({
      id: kitchenTicket.id,
      kitchenTicketNo: kitchenTicket.kitchenTicketNo,
      status: kitchenTicket.status,
      sentAt: kitchenTicket.sentAt.toISOString(),
      items: kitchenTicket.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.productName,
        qty: item.qty,
        note: item.note || "",
        kitchenStation: item.kitchenStation,
        preparationMinutes: item.preparationMinutes,
      })),
    })),
  };
}

function mapTableStatus(ticket: ReturnType<typeof mapTicket> | null) {
  if (!ticket) return "FREE";
  if (ticket.status === RestaurantTicketStatus.OPEN) return "OPEN";
  if (ticket.status === RestaurantTicketStatus.READY) return "READY";
  if (ticket.status === RestaurantTicketStatus.PAID) return "PAID";
  return "KITCHEN";
}

function mapKitchenTicket(ticket: KitchenTicketWithDetails) {
  return {
    id: ticket.id,
    kitchenTicketNo: ticket.kitchenTicketNo,
    organizationId: ticket.organizationId,
    branchId: ticket.branchId,
    status: ticket.status,
    sentAt: ticket.sentAt.toISOString(),
    startedAt: ticket.startedAt?.toISOString() ?? null,
    readyAt: ticket.readyAt?.toISOString() ?? null,
    servedAt: ticket.servedAt?.toISOString() ?? null,
    restaurantTicket: {
      id: ticket.restaurantTicket.id,
      ticketNo: ticket.restaurantTicket.ticketNo,
      orderMode: ticket.restaurantTicket.orderMode,
      status: ticket.restaurantTicket.status,
      table: ticket.restaurantTicket.table,
    },
    items: ticket.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.productName,
      qty: item.qty,
      note: item.note || "",
      kitchenStation: item.kitchenStation,
      preparationMinutes: item.preparationMinutes,
    })),
  };
}

async function loadTicket(tx: Prisma.TransactionClient, ticketId: string) {
  return tx.restaurantTicket.findUnique({
    where: { id: ticketId },
    include: ticketInclude,
  });
}

router.get("/restaurant/menu/:token", async (req, res) => {
  try {
    const qrToken = String(req.params.token || "").trim();
    if (!qrToken) {
      return res.status(404).json({ message: "QR menu олдсонгүй" });
    }

    const table = await prisma.restaurantTable.findUnique({
      where: { qrToken },
      select: {
        id: true,
        code: true,
        label: true,
        zone: true,
        seats: true,
        isActive: true,
        organizationId: true,
        branchId: true,
        organization: { select: { id: true, name: true } },
        branch: {
          select: { id: true, name: true, deletedAt: true },
        },
      },
    });
    if (!table || !table.isActive || table.branch.deletedAt) {
      return res.status(404).json({ message: "QR menu олдсонгүй" });
    }

    const [products, activeShift] = await Promise.all([
      prisma.product.findMany({
        where: {
          organizationId: table.organizationId,
          deletedAt: null,
          isActive: true,
          isRestaurantMenuItem: true,
        },
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
          taxType: true,
          cityTaxRate: true,
          classificationCode: true,
          taxProductCode: true,
          menuCategory: true,
          kitchenStation: true,
          preparationMinutes: true,
          images: { select: { url: true }, take: 1 },
        },
        orderBy: [{ menuCategory: "asc" }, { name: "asc" }],
      }),
      prisma.posShift.findFirst({
        where: {
          organizationId: table.organizationId,
          branchId: table.branchId,
          status: ShiftStatus.OPEN,
        },
        select: { id: true },
        orderBy: { openedAt: "desc" },
      }),
    ]);

    return res.json({
      organization: table.organization,
      branch: { id: table.branch.id, name: table.branch.name },
      table: {
        id: table.id,
        code: table.code,
        label: table.label,
        zone: table.zone,
        seats: table.seats,
      },
      orderingAvailable: Boolean(activeShift),
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        imageUrl: product.images[0]?.url ?? null,
        price: Number(product.price),
        stockQty: product.stock,
        taxType: product.taxType || "VAT_ABLE",
        taxRate: product.taxType === "VAT_ABLE" ? 10 : 0,
        cityTaxRate: Number(product.cityTaxRate || 0),
        classificationCode: product.classificationCode || "4711000",
        taxProductCode: product.taxProductCode || null,
        menuCategory: product.menuCategory,
        kitchenStation: product.kitchenStation,
        preparationMinutes: product.preparationMinutes,
      })),
    });
  } catch (error) {
    console.error("get public restaurant menu error", error);
    return res
      .status(500)
      .json({ message: "QR menu ачаалахад алдаа гарлаа" });
  }
});

router.post("/restaurant/menu/:token/orders", async (req, res) => {
  try {
    const qrToken = String(req.params.token || "").trim();
    const rawLines = Array.isArray(req.body?.lines)
      ? (req.body.lines as TicketLineInput[])
      : Array.isArray(req.body?.items)
        ? (req.body.items as TicketLineInput[])
        : [];
    if (!qrToken) {
      return res.status(404).json({ message: "QR menu олдсонгүй" });
    }

    const normalizedByProductId = new Map<
      string,
      { productId: string; qty: number; note: string | null }
    >();
    for (const rawLine of rawLines) {
      const productId = String(rawLine.productId || "").trim();
      const qty = Math.floor(Number(rawLine.qty || 0));
      const note = normalizeNote(rawLine.note);
      if (!productId || !Number.isFinite(qty) || qty <= 0) {
        return res
          .status(400)
          .json({ message: "Захиалгын item-ийн мэдээлэл буруу байна" });
      }
      const existing = normalizedByProductId.get(productId);
      normalizedByProductId.set(productId, {
        productId,
        qty: (existing?.qty || 0) + qty,
        note: note || existing?.note || null,
      });
    }

    const normalizedLines = [...normalizedByProductId.values()];
    if (normalizedLines.length === 0) {
      return res
        .status(400)
        .json({ message: "Захиалах хоол сонгоно уу" });
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const table = await tx.restaurantTable.findUnique({
          where: { qrToken },
          select: {
            id: true,
            code: true,
            label: true,
            isActive: true,
            organizationId: true,
            branchId: true,
            branch: { select: { deletedAt: true } },
          },
        });
        if (!table || !table.isActive || table.branch.deletedAt) {
          throw Object.assign(new Error("QR menu олдсонгүй"), { status: 404 });
        }

        await tx.$queryRaw`
          SELECT "id"
          FROM "RestaurantTable"
          WHERE "id" = ${table.id}
          FOR UPDATE
        `;

        const activeShift = await tx.posShift.findFirst({
          where: {
            organizationId: table.organizationId,
            branchId: table.branchId,
            status: ShiftStatus.OPEN,
          },
          select: { id: true, cashierId: true },
          orderBy: { openedAt: "desc" },
        });
        if (!activeShift) {
          throw Object.assign(
            new Error("Касс нээгдээгүй байна. Зөөгчид хандаарай."),
            { status: 409 },
          );
        }

        let ticket = await tx.restaurantTicket.findFirst({
          where: {
            tableId: table.id,
            status: { in: EDITABLE_TICKET_STATUSES },
          },
          orderBy: { updatedAt: "desc" },
          include: { items: true, kitchenTickets: { select: { id: true } } },
        });

        if (!ticket) {
          const paidOccupiedTicket = await tx.restaurantTicket.findFirst({
            where: {
              tableId: table.id,
              status: RestaurantTicketStatus.PAID,
            },
            orderBy: { updatedAt: "desc" },
            select: { ticketNo: true },
          });
          if (paidOccupiedTicket) {
            throw Object.assign(
              new Error(
                `Ширээ төлбөр төлсөн ticket-тэй (${paidOccupiedTicket.ticketNo}) хэвээр байна. Зөөгчид хандаарай.`,
              ),
              { status: 409 },
            );
          }
        }

        if (ticket && ticket.shiftId !== activeShift.id) {
          throw Object.assign(
            new Error("Энэ ширээний ticket өөр ээлж дээр нээлттэй байна. Зөөгчид хандаарай."),
            { status: 409 },
          );
        }

        const productIds = normalizedLines.map((line) => line.productId);
        const products = await tx.product.findMany({
          where: {
            id: { in: productIds },
            organizationId: table.organizationId,
            deletedAt: null,
            isActive: true,
            isRestaurantMenuItem: true,
          },
          select: {
            id: true,
            name: true,
            price: true,
            stock: true,
            kitchenStation: true,
            preparationMinutes: true,
          },
        });
        if (products.length !== productIds.length) {
          throw Object.assign(
            new Error("Зарим хоол идэвхгүй эсвэл менюд байхгүй байна"),
            { status: 400 },
          );
        }

        const qrOrderNote = normalizeQrCustomerNote(req.body?.note);
        if (!ticket) {
          ticket = await tx.restaurantTicket.create({
            data: {
              ticketNo: generateNumber("RT"),
              organizationId: table.organizationId,
              branchId: table.branchId,
              shiftId: activeShift.id,
              tableId: table.id,
              openedById: activeShift.cashierId,
              orderMode: RestaurantOrderMode.DINE_IN,
              note: qrOrderNote,
            },
            include: { items: true, kitchenTickets: { select: { id: true } } },
          });
        } else if (normalizeNote(req.body?.note)) {
          const nextNote = [ticket.note, qrOrderNote]
            .filter(Boolean)
            .join(" | ")
            .slice(0, 500);
          await tx.restaurantTicket.update({
            where: { id: ticket.id },
            data: { note: nextNote || null },
          });
        }

        const existingByProduct = new Map(
          ticket.items.map((item) => [item.productId, item]),
        );
        const orderedKitchenItems: Array<{
          ticketItemId: string;
          productId: string;
          productName: string;
          qty: number;
          note: string | null;
          kitchenStation: string | null;
          preparationMinutes: number | null;
        }> = [];
        for (const line of normalizedLines) {
          const product = products.find((item) => item.id === line.productId)!;
          const existing = existingByProduct.get(line.productId);
          const nextQty = (existing?.qty || 0) + line.qty;
          const nextSentQty = Math.min(
            nextQty,
            (existing?.sentQty || 0) + line.qty,
          );
          if (nextQty > product.stock) {
            throw Object.assign(
              new Error(
                `"${product.name}" хоолны үлдэгдэл хүрэлцэхгүй (${product.stock})`,
              ),
              { status: 409 },
            );
          }

          const savedItem = await tx.restaurantTicketItem.upsert({
            where: {
              ticketId_productId: {
                ticketId: ticket.id,
                productId: line.productId,
              },
            },
            create: {
              ticketId: ticket.id,
              productId: product.id,
              productName: product.name,
              unitPrice: product.price,
              qty: line.qty,
              sentQty: line.qty,
              note: line.note,
              kitchenStation: product.kitchenStation,
              preparationMinutes: product.preparationMinutes,
            },
            update: {
              productName: product.name,
              qty: nextQty,
              sentQty: nextSentQty,
              note: line.note || existing?.note || null,
              kitchenStation: product.kitchenStation,
              preparationMinutes: product.preparationMinutes,
            },
            select: {
              id: true,
              productId: true,
              productName: true,
              note: true,
              kitchenStation: true,
              preparationMinutes: true,
            },
          });

          orderedKitchenItems.push({
            ticketItemId: savedItem.id,
            productId: savedItem.productId,
            productName: savedItem.productName,
            qty: line.qty,
            note: savedItem.note,
            kitchenStation: savedItem.kitchenStation,
            preparationMinutes: savedItem.preparationMinutes,
          });
        }

        const itemsByStation = new Map<string, typeof orderedKitchenItems>();
        for (const kitchenItem of orderedKitchenItems) {
          const station = kitchenItem.kitchenStation || "HOT_KITCHEN";
          const stationItems = itemsByStation.get(station) || [];
          stationItems.push(kitchenItem);
          itemsByStation.set(station, stationItems);
        }

        await Promise.all(
          [...itemsByStation.values()].map((stationItems) =>
            tx.kitchenTicket.create({
              data: {
                kitchenTicketNo: generateNumber("KT"),
                organizationId: table.organizationId,
                branchId: table.branchId,
                restaurantTicketId: ticket.id,
                sentById: activeShift.cashierId,
                status: KitchenTicketStatus.NEW,
                items: {
                  create: stationItems.map((item) => ({
                    restaurantTicketItemId: item.ticketItemId,
                    productId: item.productId,
                    productName: item.productName,
                    qty: item.qty,
                    note: item.note,
                    kitchenStation: item.kitchenStation || "HOT_KITCHEN",
                    preparationMinutes: item.preparationMinutes,
                  })),
                },
              },
            }),
          ),
        );

        await tx.restaurantTicket.update({
          where: { id: ticket.id },
          data: {
            status: RestaurantTicketStatus.KITCHEN,
            sentAt: ticket.sentAt || new Date(),
          },
        });

        return loadTicket(tx, ticket.id);
      },
      { isolationLevel: "Serializable" },
    );

    if (!result) {
      return res
        .status(500)
        .json({ message: "Захиалга үүсгэхэд алдаа гарлаа" });
    }

    return res.status(201).json({
      ticket: mapTicket(result),
      message: "Захиалга касс болон гал тогоо руу амжилттай илгээгдлээ",
    });
  } catch (error) {
    const known = error as Error & { status?: number };
    if (known.status) {
      return res.status(known.status).json({ message: known.message });
    }
    console.error("create public restaurant order error", error);
    return res
      .status(500)
      .json({ message: "QR захиалга үүсгэхэд алдаа гарлаа" });
  }
});

router.get("/restaurant/pos/kitchen-tickets", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const branchId = String(req.query.branchId || "").trim();
    if (!branchId) {
      return res.status(400).json({ message: "branchId шаардлагатай" });
    }
    const access = await requireBranchAccess(actor, branchId);
    if ("error" in access && access.error) {
      return res
        .status(access.error.status)
        .json({ message: access.error.message });
    }

    const tickets = await prisma.kitchenTicket.findMany({
      where: {
        branchId,
        organizationId: access.branch.organizationId,
        status: { in: ACTIVE_KITCHEN_TICKET_STATUSES },
      },
      orderBy: [{ sentAt: "asc" }, { kitchenTicketNo: "asc" }],
      take: 100,
      include: kitchenTicketInclude,
    });

    return res.json(tickets.map(mapKitchenTicket));
  } catch (error) {
    console.error("get kitchen tickets error", error);
    return res
      .status(500)
      .json({ message: "Гал тогооны захиалга авахад алдаа гарлаа" });
  }
});

router.patch("/restaurant/pos/kitchen-tickets/:id/status", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const kitchenTicketId = String(req.params.id || "").trim();
    const branchId = String(req.body?.branchId || "").trim();
    const nextStatus = String(req.body?.status || "")
      .trim()
      .toUpperCase() as KitchenTicketStatus;

    if (!kitchenTicketId || !branchId) {
      return res
        .status(400)
        .json({ message: "branchId болон kitchenTicketId шаардлагатай" });
    }
    const allowedNextStatuses: KitchenTicketStatus[] = [
      KitchenTicketStatus.PREPARING,
      KitchenTicketStatus.READY,
      KitchenTicketStatus.SERVED,
    ];
    if (!allowedNextStatuses.includes(nextStatus)) {
      return res.status(400).json({ message: "Гал тогооны төлөв буруу байна" });
    }

    const access = await requireBranchAccess(actor, branchId);
    if ("error" in access && access.error) {
      return res
        .status(access.error.status)
        .json({ message: access.error.message });
    }

    const updated = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`
          SELECT "id"
          FROM "KitchenTicket"
          WHERE "id" = ${kitchenTicketId}
          FOR UPDATE
        `;

        const current = await tx.kitchenTicket.findFirst({
          where: {
            id: kitchenTicketId,
            branchId,
            organizationId: access.branch.organizationId,
          },
          select: {
            id: true,
            status: true,
            restaurantTicketId: true,
            startedAt: true,
          },
        });
        if (!current) {
          throw Object.assign(new Error("Гал тогооны ticket олдсонгүй"), {
            status: 404,
          });
        }

        const expectedNext =
          current.status === KitchenTicketStatus.NEW
            ? KitchenTicketStatus.PREPARING
            : current.status === KitchenTicketStatus.PREPARING
              ? KitchenTicketStatus.READY
              : current.status === KitchenTicketStatus.READY
                ? KitchenTicketStatus.SERVED
                : null;
        if (current.status !== nextStatus && expectedNext !== nextStatus) {
          throw Object.assign(
            new Error(
              `Ticket-ийн төлөвийг ${current.status}-оос ${nextStatus} болгох боломжгүй`,
            ),
            { status: 409 },
          );
        }

        const now = new Date();
        await tx.kitchenTicket.update({
          where: { id: current.id },
          data: {
            status: nextStatus,
            startedAt:
              nextStatus === KitchenTicketStatus.PREPARING
                ? current.startedAt || now
                : undefined,
            readyAt:
              nextStatus === KitchenTicketStatus.READY ? now : undefined,
            servedAt:
              nextStatus === KitchenTicketStatus.SERVED ? now : undefined,
          },
        });

        const siblingTickets = await tx.kitchenTicket.findMany({
          where: { restaurantTicketId: current.restaurantTicketId },
          select: { status: true },
        });
        const activeSiblings = siblingTickets.filter(
          (ticket) => ticket.status !== KitchenTicketStatus.CANCELLED,
        );
        const restaurantStatus =
          activeSiblings.length > 0 &&
          activeSiblings.every(
            (ticket) => ticket.status === KitchenTicketStatus.SERVED,
          )
            ? RestaurantTicketStatus.SERVED
            : activeSiblings.length > 0 &&
                activeSiblings.every(
                  (ticket) =>
                    ticket.status === KitchenTicketStatus.READY ||
                    ticket.status === KitchenTicketStatus.SERVED,
                )
              ? RestaurantTicketStatus.READY
              : RestaurantTicketStatus.KITCHEN;

        await tx.restaurantTicket.updateMany({
          where: {
            id: current.restaurantTicketId,
            status: { in: EDITABLE_TICKET_STATUSES },
          },
          data: { status: restaurantStatus },
        });

        return tx.kitchenTicket.findUnique({
          where: { id: current.id },
          include: kitchenTicketInclude,
        });
      },
      { isolationLevel: "Serializable" },
    );

    if (!updated) {
      return res.status(404).json({ message: "Гал тогооны ticket олдсонгүй" });
    }
    return res.json(mapKitchenTicket(updated));
  } catch (error) {
    const known = error as Error & { status?: number };
    if (known.status) {
      return res.status(known.status).json({ message: known.message });
    }
    console.error("update kitchen ticket status error", error);
    return res
      .status(500)
      .json({ message: "Гал тогооны төлөв шинэчлэхэд алдаа гарлаа" });
  }
});

router.get("/restaurant/pos/tables", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const branchId = String(req.query.branchId || "").trim();
    if (!branchId) {
      return res.status(400).json({ message: "branchId шаардлагатай" });
    }
    const access = await requireBranchAccess(actor, branchId);
    if ("error" in access && access.error) {
      return res
        .status(access.error.status)
        .json({ message: access.error.message });
    }

    const tables = await prisma.restaurantTable.findMany({
      where: { branchId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      include: {
        tickets: {
          where: { status: { in: OCCUPIED_TICKET_STATUSES } },
          orderBy: { updatedAt: "desc" },
          take: 1,
          include: ticketInclude,
        },
      },
    });

    return res.json(
      tables.map((table) => {
        const currentTicket = table.tickets[0]
          ? mapTicket(table.tickets[0])
          : null;
        return {
          id: table.id,
          code: table.code,
          label: table.label,
          qrToken: table.qrToken,
          zone: table.zone,
          seats: table.seats,
          status: mapTableStatus(currentTicket),
          total: currentTicket?.total ?? 0,
          currentTicket,
        };
      }),
    );
  } catch (error) {
    console.error("get restaurant tables error", error);
    return res
      .status(500)
      .json({ message: "Рестораны ширээ авахад алдаа гарлаа" });
  }
});

router.post("/restaurant/pos/tables/bootstrap", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const branchId = String(req.body?.branchId || "").trim();
    if (!branchId) {
      return res.status(400).json({ message: "branchId шаардлагатай" });
    }
    const access = await requireBranchAccess(actor, branchId);
    if ("error" in access && access.error) {
      return res
        .status(access.error.status)
        .json({ message: access.error.message });
    }

    await prisma.restaurantTable.createMany({
      data: DEFAULT_TABLES.map((table) => ({
        id: crypto.randomUUID(),
        organizationId: access.branch.organizationId,
        branchId,
        qrToken: generateTableQrToken(),
        ...table,
      })),
      skipDuplicates: true,
    });

    return res.status(201).json({ ok: true });
  } catch (error) {
    console.error("bootstrap restaurant tables error", error);
    return res
      .status(500)
      .json({ message: "Рестораны ширээ үүсгэхэд алдаа гарлаа" });
  }
});

router.post("/restaurant/pos/tables/:id/qr-token", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const tableId = String(req.params.id || "").trim();
    const branchId = String(req.body?.branchId || "").trim();
    if (!tableId || !branchId) {
      return res
        .status(400)
        .json({ message: "branchId болон tableId шаардлагатай" });
    }

    const access = await requireBranchAccess(actor, branchId);
    if ("error" in access && access.error) {
      return res
        .status(access.error.status)
        .json({ message: access.error.message });
    }

    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`
          SELECT "id"
          FROM "RestaurantTable"
          WHERE "id" = ${tableId}
          FOR UPDATE
        `;

        const table = await tx.restaurantTable.findFirst({
          where: {
            id: tableId,
            branchId,
            organizationId: access.branch.organizationId,
            isActive: true,
          },
          select: {
            id: true,
            code: true,
            label: true,
            qrToken: true,
          },
        });
        if (!table) {
          throw Object.assign(new Error("Ширээ олдсонгүй"), { status: 404 });
        }

        const qrToken =
          table.qrToken || (await ensureTableQrToken(tx, table.id));
        if (!qrToken) {
          throw Object.assign(new Error("QR token үүсгэхэд алдаа гарлаа"), {
            status: 500,
          });
        }

        return { ...table, qrToken };
      },
      { isolationLevel: "Serializable" },
    );

    return res.json(result);
  } catch (error) {
    const known = error as Error & { status?: number };
    if (known.status) {
      return res.status(known.status).json({ message: known.message });
    }
    console.error("ensure restaurant table qr token error", error);
    return res
      .status(500)
      .json({ message: "Ширээний QR token үүсгэхэд алдаа гарлаа" });
  }
});

router.post("/restaurant/pos/tickets", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const branchId = String(req.body?.branchId || "").trim();
    const shiftId = String(req.body?.shiftId || "").trim();
    const tableId = String(req.body?.tableId || "").trim();
    const orderMode = normalizeOrderMode(req.body?.orderMode);
    const lines = Array.isArray(req.body?.lines)
      ? (req.body.lines as TicketLineInput[])
      : [];

    if (!branchId || !shiftId || !tableId) {
      return res
        .status(400)
        .json({ message: "branchId, shiftId болон tableId шаардлагатай" });
    }
    const access = await requireBranchAccess(actor, branchId);
    if ("error" in access && access.error) {
      return res
        .status(access.error.status)
        .json({ message: access.error.message });
    }

    const normalizedLines = lines.map((line) => ({
      productId: String(line.productId || "").trim(),
      qty: Math.floor(Number(line.qty || 0)),
      note: normalizeNote(line.note),
    }));
    if (
      normalizedLines.some(
        (line) =>
          !line.productId || !Number.isFinite(line.qty) || line.qty <= 0,
      )
    ) {
      return res
        .status(400)
        .json({ message: "Ticket item-ийн мэдээлэл буруу" });
    }
    if (
      new Set(normalizedLines.map((line) => line.productId)).size !==
      normalizedLines.length
    ) {
      return res
        .status(400)
        .json({ message: "Ticket-д давхардсан хоол байна" });
    }

    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`
          SELECT "id"
          FROM "RestaurantTable"
          WHERE "id" = ${tableId}
          FOR UPDATE
        `;
        const table = await tx.restaurantTable.findFirst({
          where: {
            id: tableId,
            branchId,
            organizationId: access.branch.organizationId,
            isActive: true,
          },
          select: { id: true },
        });
        if (!table)
          throw Object.assign(new Error("Ширээ олдсонгүй"), { status: 404 });

        await tx.$queryRaw`
          SELECT "id"
          FROM "PosShift"
          WHERE "id" = ${shiftId}
          FOR UPDATE
        `;
        const activeShift = await tx.posShift.findUnique({
          where: { id: shiftId },
          select: {
            id: true,
            status: true,
            organizationId: true,
            branchId: true,
            cashierId: true,
          },
        });
        if (!activeShift) {
          throw Object.assign(new Error("Кассын ээлж олдсонгүй"), {
            status: 404,
          });
        }
        if (activeShift.status !== "OPEN") {
          throw Object.assign(new Error("Кассын ээлж хаалттай байна"), {
            status: 409,
          });
        }
        if (
          activeShift.organizationId !== access.branch.organizationId ||
          activeShift.branchId !== branchId ||
          activeShift.cashierId !== actor.id
        ) {
          throw Object.assign(
            new Error("Ticket үүсгэх ээлж кассчин эсвэл салбартай зөрүүтэй"),
            { status: 403 },
          );
        }

        let ticket = await tx.restaurantTicket.findFirst({
          where: { tableId, status: { in: EDITABLE_TICKET_STATUSES } },
          orderBy: { updatedAt: "desc" },
          include: { items: true, kitchenTickets: { select: { id: true } } },
        });

        if (!ticket && normalizedLines.length === 0) return null;
        if (!ticket) {
          const paidOccupiedTicket = await tx.restaurantTicket.findFirst({
            where: { tableId, status: RestaurantTicketStatus.PAID },
            orderBy: { updatedAt: "desc" },
            select: { ticketNo: true },
          });
          if (paidOccupiedTicket) {
            throw Object.assign(
              new Error(
                `Ширээ төлбөр төлсөн ticket-тэй (${paidOccupiedTicket.ticketNo}) хэвээр байна. Эхлээд ширээг чөлөөлнө үү.`,
              ),
              { status: 409 },
            );
          }
        }
        if (ticket && ticket.shiftId !== shiftId) {
          throw Object.assign(
            new Error("Энэ ширээний ticket өөр ээлж дээр нээлттэй байна"),
            { status: 409 },
          );
        }

        const productIds = normalizedLines.map((line) => line.productId);
        const products = productIds.length
          ? await tx.product.findMany({
              where: {
                id: { in: productIds },
                organizationId: access.branch.organizationId,
                deletedAt: null,
                isActive: true,
                isRestaurantMenuItem: true,
              },
              select: {
                id: true,
                name: true,
                price: true,
                stock: true,
                kitchenStation: true,
                preparationMinutes: true,
              },
            })
          : [];
        if (products.length !== productIds.length) {
          throw Object.assign(
            new Error("Зарим хоол идэвхгүй эсвэл рестораны менюд байхгүй"),
            { status: 400 },
          );
        }

        if (!ticket) {
          ticket = await tx.restaurantTicket.create({
            data: {
              ticketNo: generateNumber("RT"),
              organizationId: access.branch.organizationId,
              branchId,
              shiftId,
              tableId,
              openedById: actor.id,
              orderMode,
              note: normalizeNote(req.body?.note),
            },
            include: { items: true, kitchenTickets: { select: { id: true } } },
          });
        }

        const existingByProduct = new Map(
          ticket.items.map((item) => [item.productId, item]),
        );
        const nextProductIds = new Set(productIds);
        for (const existing of ticket.items) {
          if (nextProductIds.has(existing.productId)) continue;
          if (existing.sentQty > 0) {
            throw Object.assign(
              new Error(
                `"${existing.productName}" гал тогоонд илгээгдсэн тул устгах боломжгүй`,
              ),
              { status: 409 },
            );
          }
          await tx.restaurantTicketItem.delete({ where: { id: existing.id } });
        }

        for (const line of normalizedLines) {
          const product = products.find((item) => item.id === line.productId)!;
          const existing = existingByProduct.get(line.productId);
          if (
            line.qty > product.stock &&
            (!existing || line.qty > existing.qty)
          ) {
            throw Object.assign(
              new Error(
                `"${product.name}" хоолны үлдэгдэл хүрэлцэхгүй (${product.stock})`,
              ),
              { status: 409 },
            );
          }
          if (existing && line.qty < existing.sentQty) {
            throw Object.assign(
              new Error(
                `"${existing.productName}"-ийн илгээсэн тооноос багасгах боломжгүй`,
              ),
              { status: 409 },
            );
          }

          await tx.restaurantTicketItem.upsert({
            where: {
              ticketId_productId: {
                ticketId: ticket.id,
                productId: line.productId,
              },
            },
            create: {
              ticketId: ticket.id,
              productId: product.id,
              productName: product.name,
              unitPrice: product.price,
              qty: line.qty,
              note: line.note,
              kitchenStation: product.kitchenStation,
              preparationMinutes: product.preparationMinutes,
            },
            update: {
              productName: product.name,
              qty: line.qty,
              note: line.note,
              kitchenStation: product.kitchenStation,
              preparationMinutes: product.preparationMinutes,
            },
          });
        }

        await tx.restaurantTicket.update({
          where: { id: ticket.id },
          data: { orderMode, note: normalizeNote(req.body?.note) },
        });

        if (
          normalizedLines.length === 0 &&
          ticket.kitchenTickets.length === 0
        ) {
          await tx.restaurantTicket.delete({ where: { id: ticket.id } });
          return null;
        }

        return loadTicket(tx, ticket.id);
      },
      { isolationLevel: "Serializable" },
    );

    return res.json(result ? mapTicket(result) : null);
  } catch (error) {
    const known = error as Error & { status?: number };
    if (known.status) {
      return res.status(known.status).json({ message: known.message });
    }
    console.error("save restaurant ticket error", error);
    return res
      .status(500)
      .json({ message: "Рестораны ticket хадгалахад алдаа гарлаа" });
  }
});

router.post("/restaurant/pos/tickets/:id/send-kitchen", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;
    const ticketId = String(req.params.id || "").trim();

    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`
          SELECT "id"
          FROM "RestaurantTicket"
          WHERE "id" = ${ticketId}
          FOR UPDATE
        `;
        const ticket = await tx.restaurantTicket.findUnique({
          where: { id: ticketId },
          include: { items: true },
        });
        if (!ticket) {
          throw Object.assign(new Error("Ticket олдсонгүй"), { status: 404 });
        }
        if (
          actor.role !== "ADMIN" &&
          !(await hasOrgMembership(actor.id, ticket.organizationId))
        ) {
          throw Object.assign(new Error("Энэ ticket-д хандах эрхгүй"), {
            status: 403,
          });
        }
        if (!EDITABLE_TICKET_STATUSES.includes(ticket.status)) {
          throw Object.assign(new Error("Ticket аль хэдийн хаагдсан"), {
            status: 409,
          });
        }
        if (ticket.orderMode !== RestaurantOrderMode.DINE_IN) {
          throw Object.assign(
            new Error(
              "Авч явах болон хүргэлтийн захиалга төлбөр амжилттай болсны дараа автоматаар гал тогоо руу илгээгдэнэ",
            ),
            { status: 409 },
          );
        }
        const activeShift = await tx.posShift.findUnique({
          where: { id: ticket.shiftId },
          select: { status: true, cashierId: true },
        });
        if (
          !activeShift ||
          activeShift.status !== "OPEN" ||
          activeShift.cashierId !== actor.id
        ) {
          throw Object.assign(
            new Error("Ticket-ийн кассын ээлж нээлттэй биш байна"),
            { status: 409 },
          );
        }

        const unsentItems = ticket.items
          .map((item) => ({ item, qty: item.qty - item.sentQty }))
          .filter(({ qty }) => qty > 0);
        if (unsentItems.length === 0) {
          throw Object.assign(
            new Error("Гал тогоо руу илгээх шинэ хоол байхгүй"),
            { status: 409 },
          );
        }

        const itemsByStation = new Map<string, typeof unsentItems>();
        for (const unsentItem of unsentItems) {
          const station = unsentItem.item.kitchenStation || "HOT_KITCHEN";
          const stationItems = itemsByStation.get(station) || [];
          stationItems.push(unsentItem);
          itemsByStation.set(station, stationItems);
        }

        const kitchenTickets = await Promise.all(
          [...itemsByStation.values()].map((stationItems) =>
            tx.kitchenTicket.create({
              data: {
                kitchenTicketNo: generateNumber("KT"),
                organizationId: ticket.organizationId,
                branchId: ticket.branchId,
                restaurantTicketId: ticket.id,
                sentById: actor.id,
                status: KitchenTicketStatus.NEW,
                items: {
                  create: stationItems.map(({ item, qty }) => ({
                    restaurantTicketItemId: item.id,
                    productId: item.productId,
                    productName: item.productName,
                    qty,
                    note: item.note,
                    kitchenStation: item.kitchenStation || "HOT_KITCHEN",
                    preparationMinutes: item.preparationMinutes,
                  })),
                },
              },
              include: { items: true },
            }),
          ),
        );

        await Promise.all(
          unsentItems.map(({ item }) =>
            tx.restaurantTicketItem.update({
              where: { id: item.id },
              data: { sentQty: item.qty },
            }),
          ),
        );
        await tx.restaurantTicket.update({
          where: { id: ticket.id },
          data: {
            status: RestaurantTicketStatus.KITCHEN,
            sentAt: ticket.sentAt || new Date(),
          },
        });

        return {
          ticket: await loadTicket(tx, ticket.id),
          kitchenTickets,
        };
      },
      { isolationLevel: "Serializable" },
    );

    const kitchenTickets = result.kitchenTickets.map((kitchenTicket) => ({
      id: kitchenTicket.id,
      kitchenTicketNo: kitchenTicket.kitchenTicketNo,
      status: kitchenTicket.status,
      sentAt: kitchenTicket.sentAt.toISOString(),
      items: kitchenTicket.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.productName,
        qty: item.qty,
        note: item.note || "",
        kitchenStation: item.kitchenStation,
        preparationMinutes: item.preparationMinutes,
      })),
    }));

    return res.status(201).json({
      ticket: mapTicket(result.ticket!),
      kitchenTicket: kitchenTickets[0],
      kitchenTickets,
    });
  } catch (error) {
    const known = error as Error & { status?: number };
    if (known.status) {
      return res.status(known.status).json({ message: known.message });
    }
    console.error("send kitchen ticket error", error);
    return res
      .status(500)
      .json({ message: "Гал тогоо руу ticket илгээхэд алдаа гарлаа" });
  }
});

router.post("/restaurant/pos/tables/:id/clear", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const tableId = String(req.params.id || "").trim();
    const branchId = String(req.body?.branchId || "").trim();
    if (!tableId || !branchId) {
      return res
        .status(400)
        .json({ message: "branchId болон tableId шаардлагатай" });
    }

    const access = await requireBranchAccess(actor, branchId);
    if ("error" in access && access.error) {
      return res
        .status(access.error.status)
        .json({ message: access.error.message });
    }

    const table = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`
          SELECT "id"
          FROM "RestaurantTable"
          WHERE "id" = ${tableId}
          FOR UPDATE
        `;

        const existingTable = await tx.restaurantTable.findFirst({
          where: {
            id: tableId,
            branchId,
            organizationId: access.branch.organizationId,
            isActive: true,
          },
          select: { id: true },
        });
        if (!existingTable) {
          throw Object.assign(new Error("Ширээ олдсонгүй"), { status: 404 });
        }

        const unpaidCount = await tx.restaurantTicket.count({
          where: {
            tableId,
            status: { in: EDITABLE_TICKET_STATUSES },
          },
        });
        if (unpaidCount > 0) {
          throw Object.assign(
            new Error("Төлбөр дуусаагүй ticket байгаа тул ширээ чөлөөлөх боломжгүй"),
            { status: 409 },
          );
        }

        await tx.restaurantTicket.updateMany({
          where: {
            tableId,
            status: RestaurantTicketStatus.PAID,
          },
          data: {
            status: RestaurantTicketStatus.CLOSED,
            closedAt: new Date(),
          },
        });

        return tx.restaurantTable.findUnique({
          where: { id: tableId },
          include: {
            tickets: {
              where: { status: { in: OCCUPIED_TICKET_STATUSES } },
              orderBy: { updatedAt: "desc" },
              take: 1,
              include: ticketInclude,
            },
          },
        });
      },
      { isolationLevel: "Serializable" },
    );

    if (!table) {
      return res.status(404).json({ message: "Ширээ олдсонгүй" });
    }

    const currentTicket = table.tickets[0] ? mapTicket(table.tickets[0]) : null;
    return res.json({
      id: table.id,
      code: table.code,
      label: table.label,
      zone: table.zone,
      seats: table.seats,
      status: mapTableStatus(currentTicket),
      total: currentTicket?.total ?? 0,
      currentTicket,
    });
  } catch (error) {
    const known = error as Error & { status?: number };
    if (known.status) {
      return res.status(known.status).json({ message: known.message });
    }
    console.error("clear restaurant table error", error);
    return res
      .status(500)
      .json({ message: "Ширээ чөлөөлөхөд алдаа гарлаа" });
  }
});

export default router;
