import { Router, type Router as ExpressRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "@mgl/database";
import { requireAuth, type AuthPayload } from "../../middleware/auth";

const router: ExpressRouter = Router();

// ── File upload config ───────────────────────────────────────────────────
const uploadsDir = path.resolve(__dirname, "../../../uploads/dm");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dmUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".bin";
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ── Serve uploaded files ─────────────────────────────────────────────────
router.use("/dm/uploads", requireAuth, (req, res, next) => {
  const filePath = path.join(uploadsDir, path.basename(req.path));
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "Файл олдсонгүй" });
  }
  res.sendFile(filePath);
});

// ─────────────────────────────────────────────────────────────────────────
// GET /dm/conversations — list conversations for current user
// ─────────────────────────────────────────────────────────────────────────
router.get("/dm/conversations", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthPayload;

  try {
    const participations = await prisma.conversationParticipant.findMany({
      where: { userId: user.userId },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    profile: {
                      select: { fullName: true, avatarUrl: true, phoneNumber: true },
                    },
                  },
                },
              },
            },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                id: true,
                type: true,
                content: true,
                senderId: true,
                createdAt: true,
              },
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: "desc" } },
    });

    const result = participations.map((p) => {
      const conv = p.conversation;
      const otherParticipants = conv.participants.filter(
        (pp) => pp.userId !== user.userId,
      );
      const lastMsg = conv.messages[0] || null;

      // Count unread messages
      const lastReadAt = p.lastReadAt;

      return {
        id: conv.id,
        type: conv.type,
        name:
          conv.type === "GROUP"
            ? conv.name
            : otherParticipants[0]?.user?.profile?.fullName ||
              otherParticipants[0]?.user?.email ||
              "Хэрэглэгч",
        avatarUrl:
          conv.type === "GROUP"
            ? conv.avatarUrl
            : otherParticipants[0]?.user?.profile?.avatarUrl || null,
        participants: otherParticipants.map((pp) => ({
          id: pp.user.id,
          fullName: pp.user.profile?.fullName || "",
          avatarUrl: pp.user.profile?.avatarUrl || null,
          email: pp.user.email,
        })),
        lastMessage: lastMsg
          ? {
              id: lastMsg.id,
              type: lastMsg.type,
              content:
                lastMsg.type === "TEXT"
                  ? lastMsg.content
                  : lastMsg.type === "VOICE"
                    ? "🎤 Дуут мессеж"
                    : lastMsg.type === "IMAGE"
                      ? "📷 Зураг"
                      : "📎 Файл",
              senderId: lastMsg.senderId,
              createdAt: lastMsg.createdAt,
              isOwn: lastMsg.senderId === user.userId,
            }
          : null,
        lastReadAt: lastReadAt,
        updatedAt: conv.updatedAt,
      };
    });

    return res.json(result);
  } catch (error) {
    console.error("dm conversations error", error);
    return res.status(500).json({ message: "Чат жагсаалт ачаалахад алдаа гарлаа" });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// POST /dm/conversations — start a new conversation (or return existing)
// ─────────────────────────────────────────────────────────────────────────
router.post("/dm/conversations", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthPayload;
  const { recipientId } = req.body as { recipientId?: string };

  if (!recipientId) {
    return res.status(400).json({ message: "recipientId шаардлагатай" });
  }
  if (recipientId === user.userId) {
    return res.status(400).json({ message: "Өөртөө чат илгээх боломжгүй" });
  }

  try {
    // Check if recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: {
        id: true,
        email: true,
        isActive: true,
        profile: { select: { fullName: true, avatarUrl: true } },
      },
    });
    if (!recipient || !recipient.isActive) {
      return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });
    }

    // Check for existing DIRECT conversation between these two users
    const existing = await prisma.conversation.findFirst({
      where: {
        type: "DIRECT",
        AND: [
          { participants: { some: { userId: user.userId } } },
          { participants: { some: { userId: recipientId } } },
        ],
      },
      select: { id: true },
    });

    if (existing) {
      return res.json({ conversationId: existing.id, isNew: false });
    }

    // Create new conversation
    const conv = await prisma.conversation.create({
      data: {
        type: "DIRECT",
        participants: {
          create: [
            { userId: user.userId },
            { userId: recipientId },
          ],
        },
      },
    });

    return res.status(201).json({ conversationId: conv.id, isNew: true });
  } catch (error) {
    console.error("dm create conversation error", error);
    return res.status(500).json({ message: "Чат үүсгэхэд алдаа гарлаа" });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// GET /dm/conversations/:id/messages — get messages with polling
// ─────────────────────────────────────────────────────────────────────────
router.get("/dm/conversations/:id/messages", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthPayload;
  const { id } = req.params;
  const after = req.query.after as string | undefined;
  const limit = Math.min(Number(req.query.limit) || 50, 100);

  try {
    // Verify user is participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: id, userId: user.userId } },
    });
    if (!participant) {
      return res.status(403).json({ message: "Энэ чатын гишүүн биш байна" });
    }

    const messages = await prisma.directMessage.findMany({
      where: {
        conversationId: id,
        ...(after ? { createdAt: { gt: new Date(after) } } : {}),
      },
      orderBy: { createdAt: after ? "asc" : "desc" },
      take: limit,
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            profile: { select: { fullName: true, avatarUrl: true } },
          },
        },
      },
    });

    // If fetching latest (no after), reverse to chronological
    const sorted = after ? messages : messages.reverse();

    return res.json(
      sorted.map((m) => ({
        id: m.id,
        type: m.type,
        content: m.type === "TEXT" ? m.content : undefined,
        fileUrl:
          m.type !== "TEXT"
            ? `/api/dm/uploads/${m.content}`
            : undefined,
        fileName: m.fileName,
        fileSize: m.fileSize,
        duration: m.duration,
        senderId: m.senderId,
        senderName: m.sender.profile?.fullName || m.sender.email,
        senderAvatar: m.sender.profile?.avatarUrl || null,
        createdAt: m.createdAt,
        isOwn: m.senderId === user.userId,
      })),
    );
  } catch (error) {
    console.error("dm get messages error", error);
    return res.status(500).json({ message: "Мессежүүд ачаалахад алдаа гарлаа" });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// POST /dm/conversations/:id/messages — send a text message
// ─────────────────────────────────────────────────────────────────────────
router.post("/dm/conversations/:id/messages", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthPayload;
  const { id } = req.params;
  const { content } = req.body as { content?: string };

  if (!content || !content.trim()) {
    return res.status(400).json({ message: "Мессежний текст шаардлагатай" });
  }

  try {
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: id, userId: user.userId } },
    });
    if (!participant) {
      return res.status(403).json({ message: "Энэ чатын гишүүн биш байна" });
    }

    const message = await prisma.directMessage.create({
      data: {
        conversationId: id,
        senderId: user.userId,
        type: "TEXT",
        content: content.trim(),
      },
    });

    // Touch conversation + mark sender's read position
    await prisma.$transaction([
      prisma.conversation.update({
        where: { id },
        data: { updatedAt: new Date() },
      }),
      prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId: id, userId: user.userId } },
        data: { lastReadAt: message.createdAt },
      }),
    ]);

    return res.status(201).json({
      id: message.id,
      type: message.type,
      content: message.content,
      senderId: message.senderId,
      createdAt: message.createdAt,
      isOwn: true,
    });
  } catch (error) {
    console.error("dm send message error", error);
    return res.status(500).json({ message: "Мессеж илгээхэд алдаа гарлаа" });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// POST /dm/conversations/:id/voice — send a voice message
// ─────────────────────────────────────────────────────────────────────────
router.post(
  "/dm/conversations/:id/voice",
  requireAuth,
  dmUpload.single("voice"),
  async (req, res) => {
    const user = (req as any).user as AuthPayload;
    const { id } = req.params;
    const duration = Number(req.body.duration) || 0;

    if (!req.file) {
      return res.status(400).json({ message: "Дуут файл шаардлагатай" });
    }

    try {
      const participant = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId: id, userId: user.userId } },
      });
      if (!participant) {
        return res.status(403).json({ message: "Энэ чатын гишүүн биш байна" });
      }

      const message = await prisma.directMessage.create({
        data: {
          conversationId: id,
          senderId: user.userId,
          type: "VOICE",
          content: req.file.filename, // stored filename
          fileName: req.file.originalname,
          fileSize: req.file.size,
          duration,
        },
      });

      await prisma.$transaction([
        prisma.conversation.update({
          where: { id },
          data: { updatedAt: new Date() },
        }),
        prisma.conversationParticipant.update({
          where: { conversationId_userId: { conversationId: id, userId: user.userId } },
          data: { lastReadAt: message.createdAt },
        }),
      ]);

      return res.status(201).json({
        id: message.id,
        type: message.type,
        fileUrl: `/api/dm/uploads/${req.file.filename}`,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        duration,
        senderId: message.senderId,
        createdAt: message.createdAt,
        isOwn: true,
      });
    } catch (error) {
      console.error("dm send voice error", error);
      return res.status(500).json({ message: "Дуут мессеж илгээхэд алдаа гарлаа" });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────
// POST /dm/conversations/:id/file — send a file/image
// ─────────────────────────────────────────────────────────────────────────
router.post(
  "/dm/conversations/:id/file",
  requireAuth,
  dmUpload.single("file"),
  async (req, res) => {
    const user = (req as any).user as AuthPayload;
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: "Файл шаардлагатай" });
    }

    try {
      const participant = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId: id, userId: user.userId } },
      });
      if (!participant) {
        return res.status(403).json({ message: "Энэ чатын гишүүн биш байна" });
      }

      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(req.file.originalname);
      const msgType = isImage ? "IMAGE" : "FILE";

      const message = await prisma.directMessage.create({
        data: {
          conversationId: id,
          senderId: user.userId,
          type: msgType,
          content: req.file.filename,
          fileName: req.file.originalname,
          fileSize: req.file.size,
        },
      });

      await prisma.$transaction([
        prisma.conversation.update({
          where: { id },
          data: { updatedAt: new Date() },
        }),
        prisma.conversationParticipant.update({
          where: { conversationId_userId: { conversationId: id, userId: user.userId } },
          data: { lastReadAt: message.createdAt },
        }),
      ]);

      return res.status(201).json({
        id: message.id,
        type: message.type,
        fileUrl: `/api/dm/uploads/${req.file.filename}`,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        senderId: message.senderId,
        createdAt: message.createdAt,
        isOwn: true,
      });
    } catch (error) {
      console.error("dm send file error", error);
      return res.status(500).json({ message: "Файл илгээхэд алдаа гарлаа" });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────
// PATCH /dm/conversations/:id/read — mark conversation as read
// ─────────────────────────────────────────────────────────────────────────
router.patch("/dm/conversations/:id/read", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthPayload;
  const { id } = req.params;

  try {
    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: id, userId: user.userId } },
      data: { lastReadAt: new Date() },
    });

    return res.json({ success: true });
  } catch {
    return res.status(404).json({ message: "Чат олдсонгүй" });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// GET /dm/users/search?q= — search users to chat with
// ─────────────────────────────────────────────────────────────────────────
router.get("/dm/users/search", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthPayload;
  const q = ((req.query.q as string) || "").trim();

  if (q.length < 2) {
    return res.status(400).json({ message: "Хайлтын үг 2-оос дээш тэмдэгт байх ёстой" });
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        id: { not: user.userId },
        isActive: true,
        deletedAt: null,
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { profile: { fullName: { contains: q, mode: "insensitive" } } },
          { profile: { phoneNumber: { contains: q } } },
        ],
      },
      take: 20,
      select: {
        id: true,
        email: true,
        profile: {
          select: { fullName: true, avatarUrl: true, phoneNumber: true },
        },
      },
    });

    return res.json(
      users.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.profile?.fullName || "",
        avatarUrl: u.profile?.avatarUrl || null,
        phone: u.profile?.phoneNumber || null,
      })),
    );
  } catch (error) {
    console.error("dm user search error", error);
    return res.status(500).json({ message: "Хэрэглэгч хайхад алдаа гарлаа" });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// GET /dm/unread-count — total unread messages count
// ─────────────────────────────────────────────────────────────────────────
router.get("/dm/unread-count", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthPayload;

  try {
    const participations = await prisma.conversationParticipant.findMany({
      where: { userId: user.userId },
      select: { conversationId: true, lastReadAt: true },
    });

    let totalUnread = 0;
    for (const p of participations) {
      const count = await prisma.directMessage.count({
        where: {
          conversationId: p.conversationId,
          senderId: { not: user.userId },
          ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
        },
      });
      totalUnread += count;
    }

    return res.json({ unreadCount: totalUnread });
  } catch (error) {
    console.error("dm unread count error", error);
    return res.status(500).json({ message: "Уншаагүй мессеж тоолоход алдаа гарлаа" });
  }
});

export default router;
