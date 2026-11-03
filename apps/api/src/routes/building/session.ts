import { Router, type Router as ExpressRouter } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import { buildingMembershipScope } from "../../services/building/access";
const router: ExpressRouter = Router();
router.post("/session", requireAuth, async (req, res) => {
  const auth = (req as typeof req & { user: AuthPayload }).user;
  const where = buildingMembershipScope(auth.userId);
  const select = {
    organizationId: true,
    user: { select: { role: true, email: true } },
  };
  const preferred = auth.organizationId
    ? await prisma.organizationMember.findFirst({
        where: { ...where, organizationId: auth.organizationId },
        select,
      })
    : null;
  const membership =
    preferred ??
    (await prisma.organizationMember.findFirst({
      where,
      select,
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }, { id: "asc" }],
    }));
  if (!membership)
    return res
      .status(403)
      .json({
        message:
          "Өөрийн барилгын байгууллагын удирдах эрх шаардлагатай. Байгууллагаа бүртгүүлнэ үү.",
      });
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === "production")
    throw new Error("JWT_SECRET is required");
  const accessToken = jwt.sign(
    {
      userId: auth.userId,
      email: membership.user.email,
      role: membership.user.role,
      organizationId: membership.organizationId,
    },
    secret || "dev-secret-change-me",
    { expiresIn: "1d" },
  );
  return res.json({ accessToken });
});
export default router;
