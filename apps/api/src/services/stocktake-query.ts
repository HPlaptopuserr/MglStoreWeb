import type { Prisma } from "@mgl/database";

/**
 * Keep every stocktake response searchable with the current product metadata.
 * StocktakeLine fields remain the immutable snapshot used for approval/audit.
 */
export const stocktakeDetailInclude = {
  warehouse: { select: { name: true } },
  lines: {
    orderBy: { name: "asc" as const },
    include: {
      product: {
        select: {
          name: true,
          sku: true,
          barcode: true,
          barcodeAliases: true,
        },
      },
    },
  },
} satisfies Prisma.StocktakeInclude;
