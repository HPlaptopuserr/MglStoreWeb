import { prisma } from "@mgl/database";
import type { WarehouseViewerSession } from "@mgl/types";
import {
  hasPlatformWarehouseAccess,
  hasWarehouseAccess,
  type WarehouseActor,
} from "./warehouse-access.service";
import { WarehouseViewerError } from "./warehouse-viewer.policy";

export async function assertActiveWarehouseViewerActor(actor: WarehouseActor) {
  if (
    !actor.userId ||
    !(await prisma.user.findFirst({
      where: { id: actor.userId, isActive: true, deletedAt: null },
      select: { id: true },
    }))
  )
    throw new WarehouseViewerError("Нэвтрэх эрх идэвхгүй байна.", 403);
}

export async function warehouseViewerSession(
  actor: WarehouseActor,
): Promise<WarehouseViewerSession> {
  await assertActiveWarehouseViewerActor(actor);
  const platform = hasPlatformWarehouseAccess(actor.role);
  const warehouses = await prisma.warehouse.findMany({
    where: {
      type: "CENTRAL",
      isActive: true,
      deletedAt: null,
      ...(!platform
        ? {
            OR: [
              {
                setupTokens: {
                  some: { userId: actor.userId, usedAt: { not: null } },
                },
              },
              { viewers: { some: { userId: actor.userId } } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      address: true,
      setupTokens: {
        where: { userId: actor.userId, usedAt: { not: null } },
        select: { id: true },
        take: 1,
      },
      organizations: {
        select: { organization: { select: { id: true, name: true } } },
      },
    },
    orderBy: { name: "asc" },
  });
  return {
    viewerOnly:
      !platform &&
      !warehouses.some((warehouse) => warehouse.setupTokens.length > 0),
    warehouses: warehouses.map(
      ({ setupTokens, organizations, ...warehouse }) => ({
        ...warehouse,
        accessMode: platform || setupTokens.length ? "OPERATOR" : "VIEWER",
        organizations: organizations.map(({ organization }) => organization),
      }),
    ),
  };
}

export async function assertWarehouseReportAccess(
  actor: WarehouseActor,
  warehouseId: string,
) {
  await assertActiveWarehouseViewerActor(actor);
  const warehouse = await prisma.warehouse.findFirst({
    where: {
      id: warehouseId,
      type: "CENTRAL",
      isActive: true,
      deletedAt: null,
    },
    select: { id: true, name: true, address: true },
  });
  if (!warehouse)
    throw new WarehouseViewerError(
      "Дэлгүүр олдсонгүй эсвэл хандах эрхгүй байна.",
      403,
    );
  const isOperator = await hasWarehouseAccess(actor, warehouseId);
  const assignment =
    !isOperator &&
    (await prisma.warehouseViewer.findUnique({
      where: { warehouseId_userId: { warehouseId, userId: actor.userId! } },
      select: { id: true },
    }));
  if (!isOperator && !assignment)
    throw new WarehouseViewerError(
      "Энэ дэлгүүрийн тайланг харах эрхгүй байна.",
      403,
    );
  return { warehouse, isOperator };
}

export async function assertWarehouseViewerManagement(
  actor: WarehouseActor,
  warehouseId: string,
) {
  await assertActiveWarehouseViewerActor(actor);
  if (!(await hasWarehouseAccess(actor, warehouseId)))
    throw new WarehouseViewerError(
      "Энэ агуулахын хэрэглэгчийн эрхийг удирдах боломжгүй байна.",
      403,
    );
  const warehouse = await prisma.warehouse.findFirst({
    where: {
      id: warehouseId,
      type: "CENTRAL",
      isActive: true,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!warehouse) throw new WarehouseViewerError("Дэлгүүр олдсонгүй.", 404);
  return warehouse;
}
