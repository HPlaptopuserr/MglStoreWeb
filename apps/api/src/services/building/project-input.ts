import { Prisma } from "@mgl/database";

export class BuildingInputError extends Error {}

function text(
  value: unknown,
  label: string,
  max: number,
  required = false,
): string {
  if (value === undefined || value === null) {
    if (required) throw new BuildingInputError(`${label} шаардлагатай`);
    return "";
  }
  if (
    typeof value !== "string" ||
    value.trim().length > max ||
    (required && !value.trim())
  ) {
    throw new BuildingInputError(`${label} буруу байна`);
  }
  return value.trim();
}

export function parseBuildingProject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BuildingInputError("Төслийн мэдээлэл буруу байна");
  }
  const body = value as Record<string, unknown>;
  if ("organizationId" in body)
    throw new BuildingInputError(
      "Байгууллага сонгох боломжгүй. Нэвтэрсэн байгууллагад төсөл үүсгэнэ.",
    );
  const title = text(body.title, "Төслийн нэр", 180, true);
  const slug = text(body.slug, "URL нэр", 100, true);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new BuildingInputError(
      "URL нэр зөвхөн латин жижиг үсэг, тоо, зураас агуулна",
    );
  }
  const description = text(body.description, "Тайлбар", 5000);
  const district = text(body.district, "Дүүрэг", 120);
  const address = text(body.address, "Хаяг", 500);
  const coverImageUrl = text(body.coverImageUrl, "Зургийн холбоос", 2000);
  if (coverImageUrl) {
    try {
      const url = new URL(coverImageUrl);
      if (url.protocol !== "https:" || url.username || url.password)
        throw new Error();
    } catch {
      throw new BuildingInputError("Зургийн холбоос HTTPS байх ёстой");
    }
  }
  return {
    title,
    slug,
    description,
    district,
    address,
    coverImageUrl,
  } satisfies Omit<Prisma.BarilgaProjectUncheckedCreateInput, "organizationId">;
}
