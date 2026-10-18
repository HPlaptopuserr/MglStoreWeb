import type { Request, Response, NextFunction } from "express";
import { prisma, type Prisma } from "@mgl/database";
import { WorkforceDateRangeError } from "../../services/workforce/calculation";
import { WorkforceError } from "../../services/workforce/access";
export function endpoint(
  run: (req: Request, res: Response) => Promise<unknown>,
) {
  return (req: Request, res: Response, _next: NextFunction) => {
    void run(req, res).catch((error: unknown) => {
      if (error instanceof WorkforceDateRangeError) {
        res.status(400).json({ message: error.message });
        return;
      }
      if (error instanceof WorkforceError) {
        res.status(error.status).json({ message: error.message });
        return;
      }
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      ) {
        res.status(409).json({
          message: "Давхардсан мэдээлэл байна. Шинэчлээд дахин оролдоно уу",
        });
        return;
      }
      console.error("[workforce]", error);
      res
        .status(500)
        .json({ message: "Үйлдлийг гүйцэтгэж чадсангүй. Дахин оролдоно уу" });
    });
  };
}
export function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
export async function audit(
  tx: Prisma.TransactionClient,
  organizationId: string,
  actorId: string,
  action: string,
  entityId: string,
  before: unknown,
  after: unknown,
) {
  await tx.workforceAudit.create({
    data: {
      organizationId,
      actorId,
      action,
      entityId,
      ...(before === null ? {} : { before: json(before) }),
      ...(after === null ? {} : { after: json(after) }),
    },
  });
}
export async function assertMembers(
  organizationId: string,
  userIds: string[],
  tx: Prisma.TransactionClient = prisma,
) {
  const count = await tx.organizationMember.count({
    where: {
      organizationId,
      userId: { in: userIds },
      isActive: true,
      deletedAt: null,
    },
  });
  if (count !== new Set(userIds).size)
    throw new WorkforceError(
      400,
      "Сонгосон ажилтан байгууллагад байхгүй эсвэл идэвхгүй байна",
    );
}
