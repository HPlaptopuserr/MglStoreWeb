import { prisma } from "@mgl/database";
import { Permission, hasPlatformPermission, isFullAdmin } from "@mgl/types";

export type WarehouseActor = {
  userId?: string;
  role?: string;
};

export function hasPlatformWarehouseAccess(role?: string) {
  return Boolean(
    role &&
    (isFullAdmin(role) ||
      hasPlatformPermission(role, Permission.MANAGE_WAREHOUSES)),
  );
}

export async function hasWarehouseAccess(
  actor: WarehouseActor | undefined,
  warehouseId: string,
) {
  if (hasPlatformWarehouseAccess(actor?.role)) return true;
  if (!actor?.userId) return false;

  const operator = await prisma.warehouseSetupToken.findFirst({
    where: {
      userId: actor.userId,
      warehouseId,
      usedAt: { not: null },
    },
    select: { id: true },
  });
  return Boolean(operator);
}
