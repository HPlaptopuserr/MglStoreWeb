import { requireRole } from "../../middleware/auth";

import type { Request, Response, NextFunction } from "express";
import { prisma, type Prisma } from "@mgl/database";
import { isFullAdmin } from "@mgl/types";
import type { AuthPayload } from "../../middleware/auth";

/** Full administrators can manage every company; members manage only their own. */
export const requireClubAdmin = requireRole("SUPER_ADMIN", "ADMIN");

export function clubCompanyOwnershipWhere(
  req: Request,
): Prisma.FormResponseWhereInput {
  const user = (req as Request & { user: AuthPayload }).user;
  return isFullAdmin(user.role)
    ? {}
    : { data: { path: ["ownerUserId"], equals: user.userId } };
}

export async function requireClubCompanyAccess(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const user = (req as Request & { user?: AuthPayload }).user;
  if (!user) return res.sendStatus(401);
  if (isFullAdmin(user.role)) return next();
  const id = String(req.params.id);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    return res.sendStatus(403);
  try {
    const row = await prisma.formResponse.findFirst({
      where: {
        id,
        form: { slug: "mgl-club", isActive: true },
        ...clubCompanyOwnershipWhere(req),
      },
      select: { id: true },
    });
    if (!row)
      return res
        .status(403)
        .json({
          message: "Зөвхөн өөрийн байгууллагын мэдээллийг удирдах боломжтой.",
        });
    return next();
  } catch {
    return res
      .status(503)
      .json({ message: "Байгууллагын эрхийг шалгаж чадсангүй." });
  }
}

/** Keep generic form-management permissions from bypassing club content restrictions. */
export async function protectClubFormMutation(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const user = (req as Request & { user?: AuthPayload }).user;
  if (!user) return res.sendStatus(401);
  if (isFullAdmin(user.role)) return next();
  try {
    const id = String(req.params.id);
    const form = req.path.includes("form-responses")
      ? (
          await prisma.formResponse.findUnique({
            where: { id },
            select: { form: { select: { slug: true } } },
          })
        )?.form
      : await prisma.form.findUnique({ where: { id }, select: { slug: true } });
    if (form && ["mgl-club", "mgl-club-posts"].includes(form.slug))
      return res.status(403).json({
        message:
          "Байгууллагын постыг өөрийн байгууллагын удирдлагын хэсгээс засна уу.",
      });
    return next();
  } catch {
    return res
      .status(503)
      .json({ message: "Мэдээллийн эрхийг шалгаж чадсангүй." });
  }
}
