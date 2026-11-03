import type { Prisma } from "@mgl/database";
import { access, lockGroup } from "./access";
import {
  effectivePermissions,
  GroupError,
  type GroupPermission,
} from "./policy";

/** Group consent and membership are checked under the same lock as revocation. */
export async function groupTaskAccess(
  db: Prisma.TransactionClient,
  userId: string,
  groupId: string,
  organizationId: string,
  permission: GroupPermission = "PLANS_VIEW",
) {
  await lockGroup(db, groupId);
  const member = await access(db, userId, groupId);
  const company = await db.groupCompany.findFirst({
    where: {
      groupId,
      organizationId,
      disconnectedAt: null,
      organization: {
        status: "ACTIVE",
        deletedAt: null,
        businessTasksEnabled: true,
      },
    },
  });
  const granted = company ? effectivePermissions(member, company) : [];
  if (
    !company ||
    !granted.includes("PLANS_VIEW") ||
    !granted.includes(permission)
  )
    throw new GroupError(
      403,
      "Энэ компанийн төлөвлөгөөнд үйлдэл хийх эрхгүй байна.",
    );
  return { company, permissions: granted };
}
