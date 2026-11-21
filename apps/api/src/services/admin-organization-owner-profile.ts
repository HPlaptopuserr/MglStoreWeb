import type { Prisma } from "@mgl/database";

export async function saveAdminOrganizationOwnerProfile(
  tx: Prisma.TransactionClient,
  userId: string,
  data: { fullName: string; phoneNumber: string | null },
): Promise<void> {
  // Native upsert runs the INSERT phone-reservation trigger even when the
  // profile already exists, rejecting the owner's own reserved number.
  const updated = await tx.profile.updateMany({ where: { userId }, data });
  if (updated.count === 0) {
    await tx.profile.create({ data: { userId, ...data } });
  }
}

export function getAdminOrganizationConflictMessage(
  error: unknown,
): string | null {
  if (
    !error ||
    typeof error !== "object" ||
    !("code" in error) ||
    error.code !== "P2002"
  ) {
    return null;
  }
  const meta = "meta" in error ? error.meta : null;
  if (
    meta &&
    typeof meta === "object" &&
    "modelName" in meta &&
    meta.modelName === "Profile"
  ) {
    return "Нэвтрэх утас өөр хэрэглэгчид бүртгэлтэй байна. Тухайн personal account-ыг сонгох эсвэл өөр login утас оруулна уу.";
  }
  return "Байгууллагын татварын дугаар эсвэл бүртгэлийн мэдээлэл давхардсан байна. Мэдээллээ шалгаад дахин оролдоно уу.";
}
