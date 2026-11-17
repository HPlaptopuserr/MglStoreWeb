import { requireRole } from "../../middleware/auth";

import type { Request, Response, NextFunction } from "express";
import { prisma } from "@mgl/database";
import { isFullAdmin } from "@mgl/types";
import type { AuthPayload } from "../../middleware/auth";

/** Only full platform administrators manage company content; ownership grants no access. */
export const requireClubAdmin = requireRole("SUPER_ADMIN", "ADMIN");

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
        message: "Байгууллагын мэдээллийг зөвхөн систем админ удирдана.",
      });
    return next();
  } catch {
    return res
      .status(503)
      .json({ message: "Мэдээллийн эрхийг шалгаж чадсангүй." });
  }
}
