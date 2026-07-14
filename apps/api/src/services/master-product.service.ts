import type { PrismaClient } from "@prisma/client";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export const normalizeMasterBarcode = (value?: string | null) => {
  const normalized = value?.trim().toLowerCase().replace(/\s+/g, "") || null;
  return normalized && normalized.length >= 4 ? normalized : null;
};

export const normalizeMasterName = (value: string) =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase("mn")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");

interface ResolveMasterProductInput {
  masterProductId?: string | null;
  name: string;
  barcode?: string | null;
  unit?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  categoryName?: string | null;
}

export async function resolveMasterProduct(
  tx: Tx,
  input: ResolveMasterProductInput,
) {
  if (input.masterProductId) {
    return tx.masterProduct.findFirst({
      where: { id: input.masterProductId, status: "ACTIVE" },
    });
  }

  const barcode = normalizeMasterBarcode(input.barcode);
  if (barcode) {
    const canonicalName = input.name.trim();
    return tx.masterProduct.upsert({
      where: { barcode },
      update: {},
      create: {
        canonicalName,
        normalizedName: normalizeMasterName(canonicalName),
        barcode,
        unit: input.unit?.trim() || null,
        description: input.description?.trim() || null,
        imageUrl: input.imageUrl || null,
        categoryName: input.categoryName || null,
      },
    });
  }

  const canonicalName = input.name.trim();
  const normalizedName = normalizeMasterName(canonicalName);
  const existing = await tx.masterProduct.findFirst({
    where: {
      status: "ACTIVE",
      OR: [
        { normalizedName },
        { aliases: { some: { normalizedValue: normalizedName } } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;
  return tx.masterProduct.create({
    data: {
      canonicalName,
      normalizedName,
      barcode,
      unit: input.unit?.trim() || null,
      description: input.description?.trim() || null,
      imageUrl: input.imageUrl || null,
      categoryName: input.categoryName || null,
    },
  });
}

export async function addMasterProductAlias(
  tx: Tx,
  masterProductId: string,
  value: string,
) {
  const normalizedValue = normalizeMasterName(value);
  if (!normalizedValue) return;
  await tx.masterProductAlias.upsert({
    where: {
      masterProductId_normalizedValue: { masterProductId, normalizedValue },
    },
    update: { value: value.trim() },
    create: { masterProductId, value: value.trim(), normalizedValue },
  });
}
