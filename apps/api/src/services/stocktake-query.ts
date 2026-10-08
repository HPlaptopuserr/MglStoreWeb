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

export type StocktakeDetailRecord = Prisma.StocktakeGetPayload<{
  include: typeof stocktakeDetailInclude;
}>;

type SearchableStocktakeLine = {
  name: string;
  barcode: string | null;
  barcodeAliases: string[];
  product: {
    name: string;
    sku: string | null;
    barcode: string | null;
    barcodeAliases: string[];
  };
};

export function presentStocktakeLine<T extends SearchableStocktakeLine>(
  line: T,
): T {
  return {
    ...line,
    name: line.product.name.trim() || line.name,
    barcode: line.product.barcode?.trim() || line.barcode,
    barcodeAliases: [
      ...new Set(
        [
          ...line.barcodeAliases,
          line.product.sku,
          line.product.barcode,
          ...line.product.barcodeAliases,
        ].filter((value): value is string => Boolean(value?.trim())),
      ),
    ],
  };
}

/**
 * Keep older Vendor builds compatible by projecting current searchable catalog
 * metadata onto the response while retaining the immutable snapshot in storage.
 */
export function presentStocktakeDetail(
  session: StocktakeDetailRecord,
): StocktakeDetailRecord {
  return {
    ...session,
    lines: session.lines.map(presentStocktakeLine),
  };
}
