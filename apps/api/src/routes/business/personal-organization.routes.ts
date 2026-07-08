import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import {
  assertOrganizationNameAvailable,
  createPersonalOrganization,
  getPersonalOrganizationOverview,
  respondToPersonalOrganizationInvitation,
  searchPersonalOrganizationInvitees,
} from "../../services/personal-organization.service";

const router: ExpressRouter = Router();

function getAuthUser(req: Request) {
  return (req as Request & { user?: AuthPayload }).user;
}

function statusFromMessage(message: string) {
  if (message.includes("олдсонгүй")) return 404;
  if (message.includes("эрхгүй")) return 403;
  if (message.includes("аль хэдийн") || message.includes("давх")) return 409;
  return 400;
}

function sendError(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : "Хүсэлт боловсруулахад алдаа гарлаа.";
  res.status(statusFromMessage(message)).json({ message });
}

router.get("/personal-organizations/overview", requireAuth, async (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ message: "Нэвтрээгүй байна" });

  try {
    return res.json(await getPersonalOrganizationOverview(user.userId));
  } catch (error) {
    console.error("personal org overview error", error);
    return res.status(500).json({ message: "Байгууллагын хүсэлтүүд ачаалахад алдаа гарлаа." });
  }
});

router.get("/personal-organizations/name-availability", requireAuth, async (req, res) => {
  const name = typeof req.query.name === "string" ? req.query.name : "";
  try {
    await assertOrganizationNameAvailable(name);
    return res.json({ available: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Нэр шалгахад алдаа гарлаа.";
    return res.status(409).json({ available: false, message });
  }
});

router.get("/personal-organizations/user-search", requireAuth, async (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ message: "Нэвтрээгүй байна" });
  const query = typeof req.query.q === "string" ? req.query.q : "";

  try {
    return res.json(await searchPersonalOrganizationInvitees(user.userId, query));
  } catch (error) {
    sendError(res, error);
  }
});

router.post("/personal-organizations", requireAuth, async (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ message: "Нэвтрээгүй байна" });

  const body = req.body as {
    organizationName?: string;
    businessCategory?: string;
    inviteeUserId?: string;
  };

  try {
    const result = await createPersonalOrganization({
      creatorUserId: user.userId,
      organizationName: body.organizationName || "",
      businessCategory: body.businessCategory || "",
      inviteeUserId: body.inviteeUserId || "",
    });
    return res.status(201).json(result);
  } catch (error) {
    sendError(res, error);
  }
});

router.patch("/personal-organizations/invitations/:requestId", requireAuth, async (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ message: "Нэвтрээгүй байна" });
  const action = (req.body as { action?: string }).action;

  if (action !== "approve" && action !== "reject") {
    return res.status(400).json({ message: "action нь approve эсвэл reject байх ёстой." });
  }

  try {
    return res.json(
      await respondToPersonalOrganizationInvitation(
        user.userId,
        req.params.requestId,
        action,
      ),
    );
  } catch (error) {
    sendError(res, error);
  }
});

export default router;
