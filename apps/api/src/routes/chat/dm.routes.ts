import { Router, type Router as ExpressRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma, type Prisma } from "@mgl/database";
import { requireAuth, type AuthPayload } from "../../middleware/auth";

const router: ExpressRouter = Router();

// ── File upload config ───────────────────────────────────────────────────
const uploadsDir = path.resolve(__dirname, "../../../uploads/dm");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const ALLOWED_DM_MIMES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp4",
  "audio/aac",
  "audio/x-aac",
  "audio/m4a",
  "audio/x-m4a",
  "video/mp4",
  "video/webm",
  "application/pdf",
];

const dmUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".bin";
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    cb(null, ALLOWED_DM_MIMES.includes(file.mimetype));
  },
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
      where: { userId: user.userId, status: { not: "DECLINED" } },
      include: {
        conversation: {
          include: {
        participants: {
          where: { status: { not: "DECLINED" } },
          include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    profile: {
                      select: {
                        fullName: true,
                        avatarUrl: true,
                        phoneNumber: true,
                      },
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
        requestStatus: p.status,
        isRequest: p.status === "PENDING",
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
          role: pp.role,
          status: pp.status,
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
    return res
      .status(500)
      .json({ message: "Чат жагсаалт ачаалахад алдаа гарлаа" });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// POST /dm/conversations — start a new conversation (or return existing)
// ─────────────────────────────────────────────────────────────────────────
router.post("/dm/conversations", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthPayload;
  const { recipientId, type, name, participantIds } = req.body as {
    recipientId?: string;
    type?: "DIRECT" | "GROUP";
    name?: string;
    participantIds?: string[];
  };

  if (type === "GROUP") {
    const groupName = (name || "").trim();
    const uniqueParticipantIds = Array.from(
      new Set((participantIds || []).filter((id) => id && id !== user.userId)),
    );

    if (groupName.length < 2) {
      return res
        .status(400)
        .json({ message: "Group chat-ийн нэр шаардлагатай" });
    }
    if (uniqueParticipantIds.length < 2) {
      return res.status(400).json({
        message: "Group chat үүсгэхэд хамгийн багадаа 2 хүн сонгоно уу",
      });
    }

    try {
      const users = await prisma.user.findMany({
        where: {
          id: { in: uniqueParticipantIds },
          isActive: true,
          deletedAt: null,
        },
        select: { id: true },
      });
      const activeIds = users.map((item) => item.id);

      if (activeIds.length !== uniqueParticipantIds.length) {
        return res
          .status(404)
          .json({ message: "Сонгосон хэрэглэгчийн зарим нь олдсонгүй" });
      }

      const conv = await prisma.conversation.create({
        data: {
          type: "GROUP",
          name: groupName,
          participants: {
          create: [
              { userId: user.userId, role: "ADMIN", status: "ACCEPTED" },
              ...activeIds.map((id) => ({
                userId: id,
                role: "MEMBER" as const,
                status: "ACCEPTED" as const,
              })),
            ],
          },
        },
      });

      return res.status(201).json({ conversationId: conv.id, isNew: true });
    } catch (error) {
      console.error("dm create group conversation error", error);
      return res
        .status(500)
        .json({ message: "Group chat үүсгэхэд алдаа гарлаа" });
    }
  }

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
      const currentParticipant = await prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId: existing.id,
            userId: user.userId,
          },
        },
        select: { status: true },
      });
      const recipientParticipant = await prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId: existing.id,
            userId: recipientId,
          },
        },
        select: { status: true },
      });
      if (recipientParticipant?.status === "DECLINED") {
        await prisma.conversationParticipant.update({
          where: {
            conversationId_userId: {
              conversationId: existing.id,
              userId: recipientId,
            },
          },
          data: { status: "PENDING" },
        });
        await prisma.conversation.update({
          where: { id: existing.id },
          data: { updatedAt: new Date() },
        });
      }
      return res.json({
        conversationId: existing.id,
        isNew: false,
        requestStatus: currentParticipant?.status ?? "ACCEPTED",
      });
    }

    // Create new conversation
    const conv = await prisma.conversation.create({
      data: {
        type: "DIRECT",
        participants: {
          create: [
            { userId: user.userId, status: "ACCEPTED" },
            { userId: recipientId, status: "PENDING" },
          ],
        },
      },
    });

    return res.status(201).json({
      conversationId: conv.id,
      isNew: true,
      requestStatus: "ACCEPTED",
    });
  } catch (error) {
    console.error("dm create conversation error", error);
    return res.status(500).json({ message: "Чат үүсгэхэд алдаа гарлаа" });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// GET /dm/conversations/:id — group/direct info with participants
// ─────────────────────────────────────────────────────────────────────────
router.get("/dm/conversations/:id", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthPayload;
  const { id } = req.params;

  try {
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId: id, userId: user.userId },
      },
    });
    if (!participant) {
      return res.status(403).json({ message: "Энэ чатын гишүүн биш байна" });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        participants: {
          orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    fullName: true,
                    avatarUrl: true,
                    phoneNumber: true,
                  },
                },
              },
            },
          },
        },
        _count: { select: { messages: true } },
      },
    });

    if (!conversation) {
      return res.status(404).json({ message: "Чат олдсонгүй" });
    }

    return res.json({
      id: conversation.id,
      type: conversation.type,
      name: conversation.name,
      avatarUrl: conversation.avatarUrl,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      currentUserRole: participant.role,
      requestStatus: participant.status,
      isRequest: participant.status === "PENDING",
      messageCount: conversation._count.messages,
      participants: conversation.participants.map((p) => ({
        id: p.user.id,
        fullName: p.user.profile?.fullName || "",
        avatarUrl: p.user.profile?.avatarUrl || null,
        email: p.user.email,
        phone: p.user.profile?.phoneNumber || null,
        role: p.role,
        status: p.status,
        joinedAt: p.joinedAt,
        isCurrentUser: p.userId === user.userId,
      })),
    });
  } catch (error) {
    console.error("dm conversation detail error", error);
    return res
      .status(500)
      .json({ message: "Group мэдээлэл ачаалахад алдаа гарлаа" });
  }
});

router.patch("/dm/conversations/:id/request/accept", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthPayload;
  const { id } = req.params;

  try {
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId: id, userId: user.userId },
      },
      include: { conversation: { select: { type: true } } },
    });

    if (!participant) {
      return res.status(403).json({ message: "Энэ чатын гишүүн биш байна" });
    }
    if (participant.conversation.type !== "DIRECT") {
      return res.status(400).json({ message: "Group chat request биш байна" });
    }
    if (participant.status === "DECLINED") {
      return res.status(400).json({ message: "Энэ request татгалзсан байна" });
    }

    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: { conversationId: id, userId: user.userId },
      },
      data: { status: "ACCEPTED", joinedAt: new Date() },
    });
    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error("dm accept request error", error);
    return res.status(500).json({ message: "Chat request зөвшөөрөхөд алдаа гарлаа" });
  }
});

router.patch("/dm/conversations/:id/request/decline", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthPayload;
  const { id } = req.params;

  try {
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId: id, userId: user.userId },
      },
      include: { conversation: { select: { type: true } } },
    });

    if (!participant) {
      return res.status(403).json({ message: "Энэ чатын гишүүн биш байна" });
    }
    if (participant.conversation.type !== "DIRECT") {
      return res.status(400).json({ message: "Group chat request биш байна" });
    }

    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: { conversationId: id, userId: user.userId },
      },
      data: { status: "DECLINED" },
    });
    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error("dm decline request error", error);
    return res.status(500).json({ message: "Chat request татгалзахад алдаа гарлаа" });
  }
});

async function isConversationReadyForMessages(conversationId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      type: true,
      participants: { select: { status: true } },
    },
  });
  if (!conversation) return false;
  if (conversation.type === "GROUP") return true;
  return conversation.participants.every((item) => item.status === "ACCEPTED");
}

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
      where: {
        conversationId_userId: { conversationId: id, userId: user.userId },
      },
    });
    if (!participant) {
      return res.status(403).json({ message: "Энэ чатын гишүүн биш байна" });
    }
    if (participant.status === "DECLINED") {
      return res.status(403).json({ message: "Энэ chat request татгалзсан байна" });
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
        fileUrl: m.type !== "TEXT" ? `/api/dm/uploads/${m.content}` : undefined,
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
    return res
      .status(500)
      .json({ message: "Мессежүүд ачаалахад алдаа гарлаа" });
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
      where: {
        conversationId_userId: { conversationId: id, userId: user.userId },
      },
    });
    if (!participant) {
      return res.status(403).json({ message: "Энэ чатын гишүүн биш байна" });
    }
    if (participant.status !== "ACCEPTED") {
      return res
        .status(403)
        .json({ message: "Chat request зөвшөөрсний дараа мессеж бичнэ." });
    }
    if (!(await isConversationReadyForMessages(id))) {
      return res
        .status(403)
        .json({ message: "Нөгөө тал chat request зөвшөөрсний дараа мессеж бичнэ." });
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
        where: {
          conversationId_userId: { conversationId: id, userId: user.userId },
        },
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
        where: {
          conversationId_userId: { conversationId: id, userId: user.userId },
        },
      });
      if (!participant) {
        return res.status(403).json({ message: "Энэ чатын гишүүн биш байна" });
      }
      if (participant.status !== "ACCEPTED") {
        return res
          .status(403)
          .json({ message: "Chat request зөвшөөрсний дараа мессеж бичнэ." });
      }
      if (!(await isConversationReadyForMessages(id))) {
        return res
          .status(403)
          .json({ message: "Нөгөө тал chat request зөвшөөрсний дараа дуут мессеж илгээнэ." });
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
          where: {
            conversationId_userId: { conversationId: id, userId: user.userId },
          },
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
      return res
        .status(500)
        .json({ message: "Дуут мессеж илгээхэд алдаа гарлаа" });
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
        where: {
          conversationId_userId: { conversationId: id, userId: user.userId },
        },
      });
      if (!participant) {
        return res.status(403).json({ message: "Энэ чатын гишүүн биш байна" });
      }
      if (participant.status !== "ACCEPTED") {
        return res
          .status(403)
          .json({ message: "Chat request зөвшөөрсний дараа файл илгээнэ." });
      }
      if (!(await isConversationReadyForMessages(id))) {
        return res
          .status(403)
          .json({ message: "Нөгөө тал chat request зөвшөөрсний дараа файл илгээнэ." });
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
          where: {
            conversationId_userId: { conversationId: id, userId: user.userId },
          },
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
      where: {
        conversationId_userId: { conversationId: id, userId: user.userId },
      },
      data: { lastReadAt: new Date() },
    });

    return res.json({ success: true });
  } catch {
    return res.status(404).json({ message: "Чат олдсонгүй" });
  }
});

async function requireGroupAdmin(conversationId: string, userId: string) {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    include: { conversation: { select: { type: true } } },
  });
  return participant?.conversation.type === "GROUP" &&
    participant.role === "ADMIN"
    ? participant
    : null;
}

// ─────────────────────────────────────────────────────────────────────────
// POST /dm/conversations/:id/participants — add members to a group
// ─────────────────────────────────────────────────────────────────────────
router.post(
  "/dm/conversations/:id/participants",
  requireAuth,
  async (req, res) => {
    const user = (req as any).user as AuthPayload;
    const { id } = req.params;
    const { participantIds } = req.body as { participantIds?: string[] };

    const admin = await requireGroupAdmin(id, user.userId);
    if (!admin) {
      return res.status(403).json({ message: "Group admin эрх шаардлагатай" });
    }

    const uniqueIds = Array.from(
      new Set(
        (participantIds || []).filter((item) => item && item !== user.userId),
      ),
    );
    if (uniqueIds.length === 0) {
      return res.status(400).json({ message: "Нэмэх гишүүн сонгоно уу" });
    }

    try {
      const users = await prisma.user.findMany({
        where: { id: { in: uniqueIds }, isActive: true, deletedAt: null },
        select: { id: true },
      });
      const activeIds = users.map((item) => item.id);
      if (activeIds.length !== uniqueIds.length) {
        return res
          .status(404)
          .json({ message: "Сонгосон хэрэглэгчийн зарим нь олдсонгүй" });
      }

      await prisma.conversationParticipant.createMany({
        data: activeIds.map((userId) => ({
          conversationId: id,
          userId,
          role: "MEMBER",
        })),
        skipDuplicates: true,
      });

      await prisma.conversation.update({
        where: { id },
        data: { updatedAt: new Date() },
      });
      return res.status(201).json({ success: true });
    } catch (error) {
      console.error("dm add group participants error", error);
      return res.status(500).json({ message: "Гишүүн нэмэхэд алдаа гарлаа" });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────
// PATCH /dm/conversations/:id/participants/:userId/role — set group role
// ─────────────────────────────────────────────────────────────────────────
router.patch(
  "/dm/conversations/:id/participants/:userId/role",
  requireAuth,
  async (req, res) => {
    const user = (req as any).user as AuthPayload;
    const { id, userId } = req.params;
    const role = String(
      (req.body as { role?: string }).role || "",
    ).toUpperCase();

    const admin = await requireGroupAdmin(id, user.userId);
    if (!admin) {
      return res.status(403).json({ message: "Group admin эрх шаардлагатай" });
    }
    if (!["ADMIN", "MEMBER"].includes(role)) {
      return res
        .status(400)
        .json({ message: "role нь ADMIN эсвэл MEMBER байх ёстой" });
    }

    try {
      const adminCount = await prisma.conversationParticipant.count({
        where: { conversationId: id, role: "ADMIN" },
      });
      const target = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId: id, userId } },
      });
      if (!target) {
        return res.status(404).json({ message: "Гишүүн олдсонгүй" });
      }
      if (target.role === "ADMIN" && role === "MEMBER" && adminCount <= 1) {
        return res
          .status(400)
          .json({ message: "Сүүлийн admin эрхийг авах боломжгүй" });
      }

      await prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId: id, userId } },
        data: { role: role as "ADMIN" | "MEMBER" },
      });
      return res.json({ success: true });
    } catch (error) {
      console.error("dm update group role error", error);
      return res.status(500).json({ message: "Role шинэчлэхэд алдаа гарлаа" });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────
// DELETE /dm/conversations/:id/participants/me — leave group
// ─────────────────────────────────────────────────────────────────────────
router.delete(
  "/dm/conversations/:id/participants/me",
  requireAuth,
  async (req, res) => {
    const user = (req as any).user as AuthPayload;
    const { id } = req.params;

    try {
      const participant = await prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: { conversationId: id, userId: user.userId },
        },
        include: { conversation: { select: { type: true } } },
      });
      if (!participant || participant.conversation.type !== "GROUP") {
        return res.status(404).json({ message: "Group олдсонгүй" });
      }

      if (participant.role === "ADMIN") {
        const adminCount = await prisma.conversationParticipant.count({
          where: { conversationId: id, role: "ADMIN" },
        });
        if (adminCount <= 1) {
          return res
            .status(400)
            .json({ message: "Гарахаас өмнө өөр admin онооно уу" });
        }
      }

      await prisma.conversationParticipant.delete({
        where: {
          conversationId_userId: { conversationId: id, userId: user.userId },
        },
      });
      return res.json({ success: true });
    } catch (error) {
      console.error("dm leave group error", error);
      return res
        .status(500)
        .json({ message: "Group-ээс гарахад алдаа гарлаа" });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────
// GET /dm/conversations/:id/media?kind=images|files|videos|text&q=
// ─────────────────────────────────────────────────────────────────────────
router.get("/dm/conversations/:id/media", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthPayload;
  const { id } = req.params;
  const kind = String(req.query.kind || "all");
  const q = String(req.query.q || "").trim();

  try {
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId: id, userId: user.userId },
      },
    });
    if (!participant) {
      return res.status(403).json({ message: "Энэ чатын гишүүн биш байна" });
    }
    if (participant.status !== "ACCEPTED") {
      return res
        .status(403)
        .json({ message: "Chat request зөвшөөрсний дараа медиа харагдана." });
    }

    const where: Prisma.DirectMessageWhereInput = { conversationId: id };
    if (kind === "images") where.type = "IMAGE";
    if (kind === "files" || kind === "videos") where.type = "FILE";
    if (kind === "text") where.type = "TEXT";
    if (q) {
      where.OR = [
        { content: { contains: q, mode: "insensitive" } },
        { fileName: { contains: q, mode: "insensitive" } },
      ];
    }

    const messages = await prisma.directMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 80,
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

    const filtered =
      kind === "videos"
        ? messages.filter((m) => /\.(mp4|webm)$/i.test(m.fileName || m.content))
        : messages;

    return res.json(
      filtered.map((m) => ({
        id: m.id,
        type: m.type,
        content: m.type === "TEXT" ? m.content : undefined,
        fileUrl: m.type !== "TEXT" ? `/api/dm/uploads/${m.content}` : undefined,
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
    console.error("dm group media error", error);
    return res
      .status(500)
      .json({ message: "Медиа жагсаалт ачаалахад алдаа гарлаа" });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// GET /dm/users/search?q= — search users to chat with
// ─────────────────────────────────────────────────────────────────────────
router.get("/dm/users/search", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthPayload;
  const q = ((req.query.q as string) || "").trim();

  if (q.length < 2) {
    return res
      .status(400)
      .json({ message: "Хайлтын үг 2-оос дээш тэмдэгт байх ёстой" });
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
      where: { userId: user.userId, status: "ACCEPTED" },
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
    return res
      .status(500)
      .json({ message: "Уншаагүй мессеж тоолоход алдаа гарлаа" });
  }
});

export default router;
