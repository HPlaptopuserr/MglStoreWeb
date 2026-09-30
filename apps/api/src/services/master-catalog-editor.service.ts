import { Prisma, prisma } from "@mgl/database";
import { normalizeMasterName } from "./master-product.service";

export class CatalogEditError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const fields = {
  canonicalName: 200,
  barcode: 128,
  brand: 120,
  unit: 40,
  categoryName: 160,
  description: 5000,
  imageUrl: 8 * 1024 * 1024,
} as const;
export function parseCatalogEdit(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new CatalogEditError(400, "Мэдээллийн бүтэц буруу байна");
  const input = body as Record<string, unknown>;
  function text(key: keyof typeof fields): string | null {
    const value = input[key];
    if (value === null || value === "") return null;
    if (
      typeof value !== "string" ||
      value.length > fields[key] ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
    )
      throw new CatalogEditError(400, `${key}: утга буруу эсвэл хэт урт байна`);
    return value.trim() || null;
  }
  const canonicalName = text("canonicalName");
  if (
    !canonicalName ||
    canonicalName.length < 2 ||
    !/\p{L}/u.test(canonicalName)
  )
    throw new CatalogEditError(400, "Барааны нэрийг бүрэн оруулна уу");
  const imageUrl = text("imageUrl");
  if (imageUrl) {
    try {
      const inlineImage =
        /^data:image\/(?:webp|png|jpeg|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(
          imageUrl,
        );
      if (!inlineImage && new URL(imageUrl).protocol !== "https:")
        throw new Error();
    } catch {
      throw new CatalogEditError(
        400,
        "Зургийн холбоос https:// хаяг байх ёстой",
      );
    }
  }
  if (
    typeof input.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(input.updatedAt))
  )
    throw new CatalogEditError(400, "Мэдээллээ шинэчлээд дахин оролдоно уу");
  return {
    data: {
      canonicalName,
      normalizedName: normalizeMasterName(canonicalName),
      barcode: text("barcode"),
      brand: text("brand"),
      unit: text("unit"),
      categoryName: text("categoryName"),
      description: text("description"),
      imageUrl,
    },
    updatedAt: new Date(input.updatedAt),
  };
}
export const catalogEditSelect = {
  id: true,
  canonicalName: true,
  barcode: true,
  brand: true,
  unit: true,
  categoryName: true,
  description: true,
  imageUrl: true,
  updatedAt: true,
} as const;
// Expose only central catalog delegates. Store products and inventories cannot be written here.
export type CatalogEditWriter = Pick<
  Prisma.TransactionClient,
  "masterProduct" | "masterProductAlias"
>;
export async function updateCatalogRecord(
  tx: CatalogEditWriter,
  id: string,
  input: ReturnType<typeof parseCatalogEdit>,
) {
  const before = await tx.masterProduct.findUnique({
    where: { id },
    select: catalogEditSelect,
  });
  if (!before) throw new CatalogEditError(404, "Бараа олдсонгүй");
  const changed = await tx.masterProduct.updateMany({
    where: { id, updatedAt: input.updatedAt },
    data: input.data,
  });
  if (!changed.count)
    throw new CatalogEditError(
      409,
      "Өөр админ мэдээллийг шинэчилсэн байна. Хаагаад дахин нээж засна уу.",
    );
  if (before.canonicalName !== input.data.canonicalName) {
    const normalizedValue = normalizeMasterName(before.canonicalName);
    if (normalizedValue)
      await tx.masterProductAlias.upsert({
        where: {
          masterProductId_normalizedValue: {
            masterProductId: id,
            normalizedValue,
          },
        },
        create: {
          masterProductId: id,
          value: before.canonicalName,
          normalizedValue,
        },
        update: {},
      });
  }
  return tx.masterProduct.findUnique({
    where: { id },
    select: catalogEditSelect,
  });
}
export async function saveCatalogEdit(id: string, body: unknown) {
  const input = parseCatalogEdit(body);
  return prisma.$transaction((tx) => updateCatalogRecord(tx, id, input));
}
