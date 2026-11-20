import { randomUUID } from "node:crypto";
import { prisma, Prisma, InventoryReason } from "@mgl/database";
import type {
  WarehouseDispatchDocument,
  WarehouseDispatchHistory,
} from "@mgl/types";
import type { WarehouseActor } from "./warehouse-access.service";
import { assertWarehouseViewerManagement } from "./warehouse-viewer-access.service";
import { assertWarehouseProductsOwned } from "./warehouse-product-ownership";
import { adjustStock, syncProductStock } from "./inventory.service";
import {
  lockOrganizationInventory,
  resolveProductInventoryWarehouse,
} from "./vendor-inventory-warehouse.service";
import { vendorProductReadScope } from "./warehouse-product-scope";
import { stockReservationShortage } from "./stock-reservation.service";
import {
  ManualDispatchError,
  parseDispatchHistoryQuery,
  parseManualDispatch,
} from "./warehouse-manual-dispatch.policy";

const documentInclude = {
  warehouse: { select: { id: true, name: true, address: true } },
  createdBy: {
    select: { email: true, profile: { select: { fullName: true } } },
  },
  items: {
    orderBy: { id: "asc" },
    include: { product: { select: { name: true, sku: true, unit: true } } },
  },
} satisfies Prisma.WarehouseManualDispatchInclude;
type DispatchRecord = Prisma.WarehouseManualDispatchGetPayload<{
  include: typeof documentInclude;
}>;
type Actor = WarehouseActor & { userId: string };

function serialize(record: DispatchRecord): WarehouseDispatchDocument {
  const hasPrices = record.items.every((item) => item.unitPrice !== null);
  const total = record.items.reduce(
    (sum, item) => sum.plus(item.unitPrice?.times(item.quantity) ?? 0),
    new Prisma.Decimal(0),
  );
  return {
    id: record.id,
    dispatchNumber: record.dispatchNumber,
    recipientOrganizationId: record.recipientOrganizationId,
    receiptStatus: record.recipientOrganizationId
      ? record.acceptedAt
        ? "ACCEPTED"
        : "PENDING"
      : null,
    acceptedAt: record.acceptedAt?.toISOString() ?? null,
    storeName: record.storeName,
    recipientName: record.recipientName,
    recipientPhone: record.recipientPhone,
    address: record.address,
    lat: record.lat,
    lng: record.lng,
    reason: record.reason,
    note: record.note,
    paymentStatus: record.paymentStatus,
    paymentMethod: record.paymentMethod,
    paymentNote: record.paymentNote,
    createdAt: record.createdAt.toISOString(),
    createdByName: record.createdBy.profile?.fullName || record.createdBy.email,
    warehouse: record.warehouse,
    totalQuantity: record.items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: hasPrices ? total.toFixed(2) : null,
    items: record.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.productName ?? item.product.name,
      sku: item.productName !== null ? item.productSku : item.product.sku,
      unit: readSnapshot(item.productSnapshot)?.unit ?? item.product.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice?.toFixed(2) ?? null,
      totalAmount: item.unitPrice?.times(item.quantity).toFixed(2) ?? null,
    })),
  };
}

export async function createManualDispatch(
  actor: Actor,
  warehouseId: string,
  body: unknown,
) {
  await assertWarehouseViewerManagement(actor, warehouseId);
  const requested = parseManualDispatch(body);
  let input = requested;
  return prisma.$transaction(
    async (tx) => {
      if (input.recipientOrganizationId) {
        const vendor = await tx.organization.findFirst({
          where: { id: input.recipientOrganizationId, deletedAt: null },
          select: vendorSelect,
        });
        if (!vendor)
          throw new ManualDispatchError(
            "Сонгосон vendor идэвхгүй эсвэл олдсонгүй.",
            409,
          );
        const contact = vendorContact(vendor);
        input = {
          ...input,
          storeName: vendor.name,
          recipientName:
            requested.recipientName || contact.contactName || vendor.name,
          recipientPhone: requested.recipientPhone || contact.contactPhone,
          address: requested.address || vendor.address,
        };
      }
      if (input.requestId) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`manual-dispatch:${input.requestId}`}, 0))`;
        const existing = await tx.warehouseManualDispatch.findUnique({
          where: { requestId: input.requestId },
          include: documentInclude,
        });
        if (existing) {
          const sameFields = (
            [
              "recipientOrganizationId",
              "storeName",
              "recipientName",
              "recipientPhone",
              "address",
              "lat",
              "lng",
              "reason",
              "note",
              "paymentStatus",
              "paymentMethod",
              "paymentNote",
            ] as const
          ).every((key) => {
            if (requested.recipientOrganizationId) {
              if (key === "storeName") return true;
              if (
                (key === "recipientName" ||
                  key === "recipientPhone" ||
                  key === "address") &&
                requested[key] === null
              )
                return true;
            }
            return existing[key] === requested[key];
          });
          const sameItems =
            existing.items.length === input.items.length &&
            input.items.every((item) =>
              existing.items.some(
                (saved) =>
                  saved.productId === item.productId &&
                  saved.quantity === item.quantity,
              ),
            );
          if (
            existing.warehouseId !== warehouseId ||
            existing.createdById !== actor.userId ||
            !sameFields ||
            !sameItems
          )
            throw new ManualDispatchError(
              "Энэ хүсэлт өмнө нь өөр паданд ашиглагдсан байна.",
              409,
            );
          return serialize(existing);
        }
      }
      await assertWarehouseProductsOwned(
        tx,
        warehouseId,
        input.items.map((item) => item.productId),
      );
      const products = await tx.product.findMany({
        where: {
          id: { in: input.items.map((item) => item.productId) },
          deletedAt: null,
          isActive: true,
        },
        include: {
          images: {
            select: { url: true },
            orderBy: { sortOrder: "asc" },
            take: 1,
          },
        },
      });
      const byId = new Map(products.map((product) => [product.id, product]));
      if (products.length !== input.items.length)
        throw new ManualDispatchError(
          "Зарим бараа идэвхгүй эсвэл олдсонгүй.",
          409,
        );
      const lines = input.items.map((item) => {
        const product = byId.get(item.productId)!;
        const unitPrice = new Prisma.Decimal(product.price.toString());
        if (!unitPrice.isFinite() || unitPrice.lessThanOrEqualTo(0))
          throw new ManualDispatchError(
            `${product.name} барааны үнийг тохируулна уу.`,
          );
        return {
          ...item,
          productName: product.name,
          productSku: product.sku,
          unitPrice,
          productSnapshot: snapshotProduct(product),
        };
      });
      const { items: dispatchItems, ...destination } = input;
      const shortage = await stockReservationShortage(
        tx,
        warehouseId,
        dispatchItems,
      );
      if (shortage)
        throw new ManualDispatchError(
          `${byId.get(shortage.productId)!.name}: нийт үлдэгдэл ${shortage.physicalQuantity}, захиалгад нөөцөлсөн ${shortage.reservedQuantity}, гаргах боломжтой ${shortage.quantity} ш. Гаргах тоо ${shortage.requestedQuantity} ш тул хүрэлцэхгүй байна. Барааны тоогоо шинэчилнэ үү.`,
          409,
          shortage.productId,
        );
      const created = await tx.warehouseManualDispatch.create({
        data: {
          ...destination,
          warehouseId,
          createdById: actor.userId,
          dispatchNumber: `WD-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`,
          items: { create: lines },
        },
        include: documentInclude,
      });
      for (const item of dispatchItems) {
        const result = await tx.warehouseInventory.updateMany({
          where: {
            warehouseId,
            productId: item.productId,
            quantity: { gte: item.quantity },
          },
          data: { quantity: { decrement: item.quantity } },
        });
        if (result.count !== 1)
          throw new ManualDispatchError(
            "Нэг буюу хэд хэдэн барааны үлдэгдэл хүрэлцэхгүй байна.",
            409,
            item.productId,
          );
        await tx.inventoryLedger.create({
          data: {
            productId: item.productId,
            warehouseId,
            change: -item.quantity,
            reason: InventoryReason.MANUAL_ADJUST,
            note: `${created.dispatchNumber} · ${input.storeName}${input.address ? ` · ${input.address}` : ""}`,
            createdById: actor.userId,
            referenceId: created.id,
            referenceType: "WAREHOUSE_MANUAL_DISPATCH",
          },
        });
        await syncProductStock(tx, item.productId);
      }
      return serialize(created);
    },
    { timeout: 30000, maxWait: 10000 },
  );
}

export async function listManualDispatches(
  actor: Actor,
  warehouseId: string,
  query: Record<string, unknown>,
): Promise<WarehouseDispatchHistory> {
  await assertWarehouseViewerManagement(actor, warehouseId);
  const { page, pageSize, search } = parseDispatchHistoryQuery(query);
  const contains = { contains: search, mode: "insensitive" as const };
  const where: Prisma.WarehouseManualDispatchWhereInput = {
    warehouseId,
    ...(search
      ? {
          OR: [
            { dispatchNumber: contains },
            { storeName: contains },
            { recipientName: contains },
            { recipientPhone: contains },
            { address: contains },
          ],
        }
      : {}),
  };
  return prisma.$transaction(
    async (tx) => {
      const [total, records] = await Promise.all([
        tx.warehouseManualDispatch.count({ where }),
        tx.warehouseManualDispatch.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: documentInclude,
        }),
      ]);
      return {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        items: records.map(serialize),
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}

export async function getManualDispatch(
  actor: Actor,
  warehouseId: string,
  id: string,
) {
  await assertWarehouseViewerManagement(actor, warehouseId);
  const record = await prisma.warehouseManualDispatch.findFirst({
    where: { id, warehouseId },
    include: documentInclude,
  });
  if (!record) throw new ManualDispatchError("Падан олдсонгүй.", 404);
  return serialize(record);
}

const vendorSelect = {
  id: true,
  name: true,
  phone: true,
  address: true,
  members: {
    where: { role: "OWNER", isActive: true, deletedAt: null },
    take: 1,
    orderBy: { id: "asc" },
    select: {
      user: {
        select: { profile: { select: { fullName: true, phoneNumber: true } } },
      },
    },
  },
} satisfies Prisma.OrganizationSelect;
function vendorContact(
  vendor: Prisma.OrganizationGetPayload<{ select: typeof vendorSelect }>,
) {
  const profile = vendor.members[0]?.user.profile;
  return {
    id: vendor.id,
    name: vendor.name,
    address: vendor.address,
    contactName: profile?.fullName ?? null,
    contactPhone: vendor.phone || profile?.phoneNumber || null,
    lat: null,
    lng: null,
  };
}

export async function searchDispatchVendors(
  actor: Actor,
  warehouseId: string,
  query: Record<string, unknown>,
) {
  await assertWarehouseViewerManagement(actor, warehouseId);
  const search =
    typeof query.search === "string" ? query.search.trim().slice(0, 120) : "";
  const contains = { contains: search, mode: "insensitive" as const };
  const vendors = await prisma.organization.findMany({
    where: {
      deletedAt: null,
      ...(search
        ? { OR: [{ name: contains }, { phone: contains }, { taxId: contains }] }
        : {}),
    },
    select: vendorSelect,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: 30,
  });
  return { vendors: vendors.map(vendorContact) };
}

interface DispatchProductSnapshot {
  name: string;
  sku: string | null;
  unit: string | null;
  barcode: string | null;
  masterProductId: string | null;
  description: string | null;
  imageUrl: string | null;
  taxType: string;
  cityTaxRate: string;
  classificationCode: string;
  taxProductCode: string | null;
}
function snapshotProduct(
  product: Prisma.ProductGetPayload<{
    include: { images: { select: { url: true } } };
  }>,
): Prisma.InputJsonObject {
  return {
    name: product.name,
    sku: product.sku,
    unit: product.unit,
    barcode: product.barcode,
    masterProductId: product.masterProductId,
    description: product.description,
    imageUrl: product.images[0]?.url ?? null,
    taxType: product.taxType,
    cityTaxRate: product.cityTaxRate.toString(),
    classificationCode: product.classificationCode,
    taxProductCode: product.taxProductCode,
  };
}
function readSnapshot(value: Prisma.JsonValue): DispatchProductSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const {
    name,
    sku,
    unit,
    barcode,
    masterProductId,
    description,
    imageUrl,
    taxType,
    cityTaxRate,
    classificationCode,
    taxProductCode,
  } = value;
  if (
    typeof name !== "string" ||
    typeof taxType !== "string" ||
    typeof cityTaxRate !== "string" ||
    typeof classificationCode !== "string"
  )
    return null;
  const nullable = (field: Prisma.JsonValue | undefined) =>
    typeof field === "string" ? field : null;
  return {
    name,
    sku: nullable(sku),
    unit: nullable(unit),
    barcode: nullable(barcode),
    masterProductId: nullable(masterProductId),
    description: nullable(description),
    imageUrl: nullable(imageUrl),
    taxType,
    cityTaxRate,
    classificationCode,
    taxProductCode: nullable(taxProductCode),
  };
}

async function assertRecipientOwner(
  tx: Prisma.TransactionClient,
  actor: Actor,
  organizationId: unknown,
): Promise<string> {
  if (typeof organizationId !== "string" || !organizationId.trim())
    throw new ManualDispatchError("Байгууллагаа сонгоно уу.");
  const member = await tx.organizationMember.findFirst({
    where: {
      userId: actor.userId,
      organizationId,
      role: "OWNER",
      isActive: true,
      deletedAt: null,
      organization: { deletedAt: null },
    },
    select: { id: true },
  });
  if (!member)
    throw new ManualDispatchError(
      "Паданыг зөвхөн тухайн vendor-ийн эзэн харах, зөвшөөрөх эрхтэй.",
      403,
    );
  return organizationId;
}

export async function listVendorManualDispatches(
  actor: Actor,
  query: Record<string, unknown>,
): Promise<WarehouseDispatchHistory> {
  return prisma.$transaction(
    async (tx) => {
      const recipientOrganizationId = await assertRecipientOwner(
        tx,
        actor,
        query.organizationId,
      );
      const { page, pageSize, search } = parseDispatchHistoryQuery(query);
      const where: Prisma.WarehouseManualDispatchWhereInput = {
        recipientOrganizationId,
        ...(search
          ? { dispatchNumber: { contains: search, mode: "insensitive" } }
          : {}),
      };
      const [total, records] = await Promise.all([
        tx.warehouseManualDispatch.count({ where }),
        tx.warehouseManualDispatch.findMany({
          where,
          include: documentInclude,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: pageSize,
          skip: (page - 1) * pageSize,
        }),
      ]);
      return {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        items: records.map(serialize),
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}

export async function acceptVendorManualDispatch(
  actor: Actor,
  id: string,
  organizationId: unknown,
): Promise<WarehouseDispatchDocument> {
  return prisma.$transaction(
    async (tx) => {
      const recipientOrganizationId = await assertRecipientOwner(
        tx,
        actor,
        organizationId,
      );
      // Serialize catalog adoption with POS receipts and all vendor stock mutations.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${recipientOrganizationId}))`;
      await lockOrganizationInventory(tx, recipientOrganizationId);
      await tx.$queryRaw`SELECT "id" FROM "WarehouseManualDispatch" WHERE "id" = ${id} AND "recipientOrganizationId" = ${recipientOrganizationId} FOR UPDATE`;
      const dispatch = await tx.warehouseManualDispatch.findFirst({
        where: { id, recipientOrganizationId },
        include: documentInclude,
      });
      if (!dispatch) throw new ManualDispatchError("Падан олдсонгүй.", 404);
      if (dispatch.acceptedAt) return serialize(dispatch);
      for (const item of dispatch.items) {
        const snapshot = readSnapshot(item.productSnapshot);
        if (!snapshot)
          throw new ManualDispatchError(
            "Барааны мэдээлэл дутуу байна. Агуулахтай холбогдоно уу.",
            409,
          );
        const sku = `WD-${item.productId}`;
        const matches = await tx.product.findMany({
          where: {
            organizationId: recipientOrganizationId,
            deletedAt: null,
            ...vendorProductReadScope(),
            OR: [
              { sku },
              ...(snapshot.masterProductId
                ? [{ masterProductId: snapshot.masterProductId }]
                : []),
              ...(snapshot.barcode ? [{ barcode: snapshot.barcode }] : []),
            ],
          },
          take: 2,
        });
        if (matches.length > 1)
          throw new ManualDispatchError(
            `${snapshot.name}: vendor-ийн барааны бүртгэл давхар байна. Эхлээд тулган засна уу.`,
            409,
          );
        const existing = matches[0];
        if (existing && existing.unit !== snapshot.unit)
          throw new ManualDispatchError(
            `${snapshot.name}: хэмжих нэгж зөрсөн байна. Барааны бүртгэлээ тулгана уу.`,
            409,
          );
        const product =
          existing ??
          (await tx.product.create({
            data: {
              organizationId: recipientOrganizationId,
              name: snapshot.name,
              sku,
              barcode: snapshot.barcode,
              unit: snapshot.unit,
              masterProductId: snapshot.masterProductId,
              description: snapshot.description,
              price: item.unitPrice ?? 0,
              costPrice: item.unitPrice,
              taxType: snapshot.taxType,
              cityTaxRate: snapshot.cityTaxRate,
              classificationCode: snapshot.classificationCode,
              taxProductCode: snapshot.taxProductCode,
              ...(snapshot.imageUrl
                ? { images: { create: { url: snapshot.imageUrl } } }
                : {}),
            },
          }));
        if (
          existing &&
          (!existing.isActive || existing.supplyType !== "IN_STOCK")
        )
          await tx.product.update({
            where: { id: existing.id },
            data: { isActive: true, supplyType: "IN_STOCK" },
          });
        const warehouseId = await resolveProductInventoryWarehouse(
          tx,
          recipientOrganizationId,
          product.id,
          actor.userId,
          true,
        );
        await adjustStock(tx, {
          productId: product.id,
          warehouseId: warehouseId ?? undefined,
          change: item.quantity,
          reason: InventoryReason.RESTOCK,
          note: `${dispatch.dispatchNumber} · ${dispatch.warehouse.name}`,
          createdById: actor.userId,
          referenceId: dispatch.id,
          referenceType: "WAREHOUSE_DISPATCH_RECEIPT",
        });
        await tx.warehouseManualDispatchItem.update({
          where: { id: item.id },
          data: { receivedProductId: product.id },
        });
      }
      const accepted = await tx.warehouseManualDispatch.update({
        where: { id },
        data: { acceptedAt: new Date(), acceptedById: actor.userId },
        include: documentInclude,
      });
      return serialize(accepted);
    },
    { timeout: 30000, maxWait: 10000 },
  );
}
