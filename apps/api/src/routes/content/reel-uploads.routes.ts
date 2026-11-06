import {
  Router,
  type Request,
  type RequestHandler,
  type Router as ExpressRouter,
} from "express";
import { rateLimit } from "express-rate-limit";
import { prisma } from "@mgl/database";
import { Permission } from "@mgl/types";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import { assertOrgPermission } from "../../services/permission.service";
import {
  assertUploadActive,
  ownedUpload,
  parseNewReelUpload,
  partLength,
  queueReelUpload,
  startReelUpload,
  uploadStatus,
} from "../../services/reel-upload/sessions";
import {
  localReelStaging,
  partTicket,
  writeLocalPart,
} from "../../services/reel-upload/staging";
import {
  ReelUploadError,
  REEL_SOURCE_MAX_BYTES,
  REEL_PART_BYTES,
} from "../../services/reel-upload/policy";
import { getReelById } from "../../services/reel.service";

const user = (req: Request) => (req as Request & { user: AuthPayload }).user;
const wrap =
  (action: RequestHandler): RequestHandler =>
  async (req, res, next) => {
    try {
      await action(req, res, next);
    } catch (error) {
      if (error instanceof ReelUploadError) {
        res.status(error.status).json({ message: error.message });
        return;
      }
      console.error(
        "[reel-upload] request failed",
        error instanceof Error ? error.name : "unknown",
      );
      res.status(503).json({
        message:
          "Видео илгээх үйлчилгээ түр боломжгүй байна. Дахин оролдоно уу.",
      });
    }
  };
export function createReelUploadsRouter(
  authenticate: RequestHandler = requireAuth,
  getReel: typeof getReelById = getReelById,
): ExpressRouter {
  const router: ExpressRouter = Router();
  router.use("/reel-uploads", authenticate);
  router.get("/reel-uploads/capabilities", (_req, res) => {
    res.json({
      protocol: "private-parts-v1",
      maxSourceBytes: REEL_SOURCE_MAX_BYTES,
      partSize: REEL_PART_BYTES,
      maxDurationSeconds: null,
    });
  });
  router.post(
    "/reel-uploads",
    rateLimit({
      windowMs: 60000,
      limit: 10,
      keyGenerator: (req) => user(req).userId,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
    wrap(async (req, res) => {
      const input = parseNewReelUpload(req.body);
      const activeUser = await prisma.user.findFirst({
        where: { id: user(req).userId, isActive: true, deletedAt: null },
        select: { id: true },
      });
      if (!activeUser) {
        res.sendStatus(401);
        return;
      }
      if (
        input.organizationId &&
        !(await assertOrgPermission(
          req,
          res,
          input.organizationId,
          Permission.MANAGE_PRODUCTS,
        ))
      )
        return;
      const existing = await prisma.reel.findUnique({
        where: { id: input.id },
        select: { authorId: true, organizationId: true, deletedAt: true },
      });
      if (existing) {
        if (
          existing.authorId !== user(req).userId ||
          existing.organizationId !== input.organizationId ||
          existing.deletedAt
        ) {
          throw new ReelUploadError("Upload давхардсан байна.", 409);
        }
        const reel = await getReel(input.id, true);
        res.json(
          JSON.parse(
            JSON.stringify(
              { status: "SUCCEEDED", uploadId: input.id, reel },
              (_key, value: unknown) =>
                typeof value === "bigint" ? value.toString() : value,
            ),
          ),
        );
        return;
      }
      res
        .status(201)
        .json(
          await uploadStatus(await startReelUpload(user(req).userId, input)),
        );
    }),
  );
  router.get(
    "/reel-uploads/:id",
    wrap(async (req, res) => {
      const session = await ownedUpload(req.params.id, user(req).userId);
      res.setHeader("Cache-Control", "private, no-store");
      const status = await uploadStatus(session);
      const reel =
        session.status === "SUCCEEDED" ? await getReel(session.id, true) : null;
      res.json(
        JSON.parse(
          JSON.stringify({ ...status, reel }, (_key, value: unknown) =>
            typeof value === "bigint" ? value.toString() : value,
          ),
        ),
      );
    }),
  );
  router.post(
    "/reel-uploads/:id/parts/:index",
    wrap(async (req, res) => {
      const session = await ownedUpload(req.params.id, user(req).userId);
      assertUploadActive(session);
      const index = Number(req.params.index);
      partLength(session, index);
      res.json(await partTicket(session.authorId, session.id, index));
    }),
  );
  router.put(
    "/reel-uploads/:id/parts/:index",
    wrap(async (req, res) => {
      if (!localReelStaging()) {
        res.sendStatus(404);
        return;
      }
      const session = await ownedUpload(req.params.id, user(req).userId);
      assertUploadActive(session);
      const index = Number(req.params.index);
      await writeLocalPart(
        session.authorId,
        session.id,
        index,
        req,
        partLength(session, index),
      );
      res.json({ ok: true });
    }),
  );
  router.post(
    "/reel-uploads/:id/complete",
    wrap(async (req, res) => {
      const session = await ownedUpload(req.params.id, user(req).userId);
      if (
        session.organizationId &&
        !(await assertOrgPermission(
          req,
          res,
          session.organizationId,
          Permission.MANAGE_PRODUCTS,
        ))
      )
        return;
      res.status(202).json(await uploadStatus(await queueReelUpload(session)));
    }),
  );
  router.delete(
    "/reel-uploads/:id",
    wrap(async (req, res) => {
      const session = await ownedUpload(req.params.id, user(req).userId);
      // A processing/published reel cannot be revoked through an upload cancellation.
      await prisma.reelUploadSession.updateMany({
        where: {
          id: session.id,
          status: { in: ["UPLOADING", "QUEUED", "FAILED"] },
        },
        data: { status: "CANCELLED", expiresAt: new Date() },
      });
      res.json({ ok: true });
    }),
  );
  return router;
}
export default createReelUploadsRouter();
