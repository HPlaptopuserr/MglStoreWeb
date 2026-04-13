import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import { Permission } from "@mgl/types";
import {
  requireAuth,
  requirePlatformPermission,
  type AuthPayload,
} from "../../middleware/auth";

const router: ExpressRouter = Router();

// ─── Public: Create or resume a chat session ────────────────────────────
// POST /chat/sessions
// Body: { visitorId, userId?, displayName? }
router.post("/chat/sessions", async (req, res) => {
  try {
    const { visitorId, userId, displayName } = req.body;

    if (!visitorId || typeof visitorId !== "string" || visitorId.length < 10) {
      return res.status(400).json({ message: "visitorId шаардлагатай" });
    }

    // Look for an existing open session for this visitor
    const existing = await prisma.chatSession.findFirst({
      where: { visitorId, status: "OPEN" },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (existing) {
      // Update userId/displayName if user just logged in
      if (userId && !existing.userId) {
        await prisma.chatSession.update({
          where: { id: existing.id },
          data: { userId, displayName: displayName || existing.displayName },
        });
      }
      return res.json(existing);
    }

    // Create new session
    const session = await prisma.chatSession.create({
      data: {
        visitorId,
        userId: userId || null,
        displayName: displayName || "Зочин",
      },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    res.status(201).json(session);
  } catch (error) {
    console.error("create chat session error", error);
    res.status(500).json({ message: "Чат эхлүүлэхэд алдаа гарлаа" });
  }
});

// ─── Public: Send a message ─────────────────────────────────────────────
// POST /chat/messages
// Body: { sessionId, sender: "VISITOR"|"BOT", text }
router.post("/chat/messages", async (req, res) => {
  try {
    const { sessionId, sender, text, senderId } = req.body;

    if (!sessionId || !sender || !text?.trim()) {
      return res.status(400).json({ message: "sessionId, sender, text шаардлагатай" });
    }

    if (!["VISITOR", "BOT"].includes(sender)) {
      return res.status(400).json({ message: "sender нь VISITOR эсвэл BOT байх ёстой" });
    }

    // Verify session exists and is open
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.status !== "OPEN") {
      return res.status(404).json({ message: "Чат олдсонгүй" });
    }

    const message = await prisma.chatMessage.create({
      data: {
        sessionId,
        sender,
        senderId: senderId || null,
        text: text.trim(),
      },
    });

    // Touch session updatedAt
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    res.status(201).json(message);
  } catch (error) {
    console.error("send chat message error", error);
    res.status(500).json({ message: "Мессеж илгээхэд алдаа гарлаа" });
  }
});

// ─── Public: Get messages (for polling new admin replies) ───────────────
// GET /chat/sessions/:id/messages?after=timestamp
router.get("/chat/sessions/:id/messages", async (req, res) => {
  try {
    const { id } = req.params;
    const after = req.query.after as string | undefined;

    const session = await prisma.chatSession.findUnique({
      where: { id },
    });
    if (!session) {
      return res.status(404).json({ message: "Чат олдсонгүй" });
    }

    const where: any = { sessionId: id };
    if (after) {
      where.createdAt = { gt: new Date(after) };
    }

    const messages = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });

    res.json(messages);
  } catch (error) {
    console.error("get chat messages error", error);
    res.status(500).json({ message: "Мессежүүд авахад алдаа гарлаа" });
  }
});

// ─── Admin: List all chat sessions ──────────────────────────────────────
// GET /admin/chat/sessions?status=OPEN&page=1&limit=20
router.get(
  "/admin/chat/sessions",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_CHAT),
  async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const search = (req.query.search as string)?.trim();

      const where: any = {};
      if (status === "OPEN" || status === "CLOSED") {
        where.status = status;
      }
      if (search) {
        where.OR = [
          { displayName: { contains: search, mode: "insensitive" } },
          { visitorId: { contains: search, mode: "insensitive" } },
        ];
      }

      const [sessions, total] = await Promise.all([
        prisma.chatSession.findMany({
          where,
          include: {
            user: {
              select: { id: true, email: true, profile: { select: { fullName: true } } },
            },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
          orderBy: { updatedAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.chatSession.count({ where }),
      ]);

      res.json({ data: sessions, total, page, limit });
    } catch (error) {
      console.error("admin list chat sessions error", error);
      res.status(500).json({ message: "Чат жагсаалт авахад алдаа гарлаа" });
    }
  },
);

// ─── Admin: Get a single session with all messages ──────────────────────
// GET /admin/chat/sessions/:id
router.get(
  "/admin/chat/sessions/:id",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_CHAT),
  async (req, res) => {
    try {
      const session = await prisma.chatSession.findUnique({
        where: { id: req.params.id },
        include: {
          user: {
            select: { id: true, email: true, profile: { select: { fullName: true, phoneNumber: true } } },
          },
          messages: { orderBy: { createdAt: "asc" } },
        },
      });

      if (!session) {
        return res.status(404).json({ message: "Чат олдсонгүй" });
      }

      res.json(session);
    } catch (error) {
      console.error("admin get chat session error", error);
      res.status(500).json({ message: "Чат авахад алдаа гарлаа" });
    }
  },
);

// ─── Admin: Reply to a chat session ─────────────────────────────────────
// POST /admin/chat/sessions/:id/reply
router.post(
  "/admin/chat/sessions/:id/reply",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_CHAT),
  async (req, res) => {
    try {
      const { text } = req.body;
      if (!text?.trim()) {
        return res.status(400).json({ message: "Хариу бичнэ үү" });
      }

      const session = await prisma.chatSession.findUnique({
        where: { id: req.params.id },
      });
      if (!session) {
        return res.status(404).json({ message: "Чат олдсонгүй" });
      }

      const user = (req as any).user as AuthPayload;

      const message = await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          sender: "ADMIN",
          senderId: user.userId,
          text: text.trim(),
        },
      });

      // Touch session updatedAt
      await prisma.chatSession.update({
        where: { id: session.id },
        data: { updatedAt: new Date() },
      });

      res.status(201).json(message);
    } catch (error) {
      console.error("admin reply error", error);
      res.status(500).json({ message: "Хариу илгээхэд алдаа гарлаа" });
    }
  },
);

// ─── Admin: Close a chat session ────────────────────────────────────────
// PATCH /admin/chat/sessions/:id/close
router.patch(
  "/admin/chat/sessions/:id/close",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_CHAT),
  async (req, res) => {
    try {
      const session = await prisma.chatSession.update({
        where: { id: req.params.id },
        data: { status: "CLOSED" },
      });
      res.json(session);
    } catch (error) {
      console.error("admin close chat error", error);
      res.status(500).json({ message: "Чат хаахад алдаа гарлаа" });
    }
  },
);

export default router;
