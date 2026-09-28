import {
  Router,
  type Router as ExpressRouter,
  type Request,
  type RequestHandler,
} from "express";
import { rateLimit } from "express-rate-limit";
import {
  optionalAuth,
  requireAuth,
  type AuthPayload,
} from "../../middleware/auth";
import {
  reelSocialSummary,
  ReelSocialError,
} from "../../services/reel-social/access";
import {
  listReelComments,
  addReelComment,
  deleteReelComment,
} from "../../services/reel-social/comments";
import { shareReelToChat } from "../../services/reel-social/share";

interface Dependencies {
  optional: RequestHandler;
  authenticate: RequestHandler;
  summary: typeof reelSocialSummary;
  comments: typeof listReelComments;
  add: typeof addReelComment;
  remove: typeof deleteReelComment;
  share: typeof shareReelToChat;
}
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const user = (req: Request) =>
  (req as Request & { user?: AuthPayload }).user?.userId;

export function createReelSocialRouter(
  overrides: Partial<Dependencies> = {},
): ExpressRouter {
  const deps: Dependencies = {
    optional: optionalAuth,
    authenticate: requireAuth,
    summary: reelSocialSummary,
    comments: listReelComments,
    add: addReelComment,
    remove: deleteReelComment,
    share: shareReelToChat,
    ...overrides,
  };
  const router = Router();
  const limited = rateLimit({
    windowMs: 60_000,
    limit: 30,
    keyGenerator: (req) => user(req)!,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });
  const handle =
    (action: (req: Request) => Promise<unknown>): RequestHandler =>
    async (req, res) => {
      res.set("Cache-Control", "private, no-store");
      try {
        res.json(await action(req));
      } catch (error) {
        res
          .status(error instanceof ReelSocialError ? error.status : 500)
          .json({
            message:
              error instanceof ReelSocialError
                ? error.message
                : "Хүсэлт амжилтгүй. Дахин оролдоорой.",
          });
      }
    };
  router.get(
    "/reels/:id/social",
    deps.optional,
    handle((req) => deps.summary(req.params.id, user(req))),
  );
  router.get(
    "/reels/:id/comments",
    deps.optional,
    handle((req) => {
      const cursor =
        typeof req.query.cursor === "string" ? req.query.cursor : undefined;
      if (cursor && !uuid.test(cursor))
        throw new ReelSocialError(400, "Сэтгэгдлийн хуудас буруу байна.");
      return deps.comments(req.params.id, user(req), cursor);
    }),
  );
  router.post(
    "/reels/:id/comments",
    deps.authenticate,
    limited,
    handle((req) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (
        typeof body.commentId !== "string" ||
        !uuid.test(body.commentId) ||
        !text ||
        text.length > 1000
      )
        throw new ReelSocialError(400, "1–1000 тэмдэгттэй сэтгэгдэл бичээрэй.");
      return deps.add(req.params.id, user(req)!, body.commentId, text);
    }),
  );
  router.delete(
    "/reels/:id/comments/:commentId",
    deps.authenticate,
    handle((req) =>
      deps.remove(req.params.id, user(req)!, req.params.commentId),
    ),
  );
  router.post(
    "/reels/:id/share",
    deps.authenticate,
    limited,
    handle((req) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      if (
        typeof body.shareId !== "string" ||
        !uuid.test(body.shareId) ||
        typeof body.conversationId !== "string" ||
        !/^[a-zA-Z0-9_-]{1,128}$/.test(body.conversationId)
      )
        throw new ReelSocialError(400, "Илгээх чатаа сонгоорой.");
      return deps.share(
        req.params.id,
        user(req)!,
        body.conversationId,
        body.shareId,
      );
    }),
  );
  return router;
}
