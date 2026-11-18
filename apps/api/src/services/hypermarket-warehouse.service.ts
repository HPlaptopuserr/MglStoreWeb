import { prisma } from "@mgl/database";
import { WarehouseRetailError } from "./warehouse-retail.policy";

/** Catalog and checkout must resolve the same single active warehouse. */
export async function getHypermarketWarehouse() {
  const warehouses = await prisma.warehouse.findMany({
    where: {
      OR: [
        { name: { equals: "Hypermarket", mode: "insensitive" } },
        { name: { equals: "Хайпер Маркет", mode: "insensitive" } },
      ],
      deletedAt: null,
      isActive: true,
    },
    select: { id: true, name: true },
    take: 2,
  });
  if (warehouses.length !== 1) {
    throw new WarehouseRetailError(
      warehouses.length
        ? "Hypermarket агуулахын тохиргоо давхардсан байна."
        : "Hypermarket агуулах олдсонгүй.",
      warehouses.length ? 409 : 404,
    );
  }
  return warehouses[0];
}
