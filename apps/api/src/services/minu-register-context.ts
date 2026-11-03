import { prisma } from "@mgl/database";
import type { MinuAgentContext } from "./minu-pos-agent";

export async function getMinuAgentContextForRegister(
  registerId: string | null,
): Promise<MinuAgentContext | null> {
  if (!registerId) return null;
  const register = await prisma.posRegister.findUnique({
    where: { id: registerId },
    select: {
      organization: {
        select: {
          minuAgentEnabled: true,
          minuAgentUsername: true,
          minuAgentPassword: true,
          minuAgentBranchId: true,
        },
      },
    },
  });
  const org = register?.organization;
  if (
    !org?.minuAgentEnabled ||
    !org.minuAgentUsername ||
    !org.minuAgentPassword ||
    !org.minuAgentBranchId
  )
    return null;
  return {
    username: org.minuAgentUsername,
    password: org.minuAgentPassword,
    branchId: org.minuAgentBranchId,
  };
}
