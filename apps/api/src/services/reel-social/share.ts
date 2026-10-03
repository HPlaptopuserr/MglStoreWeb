import { prisma } from "@mgl/database";
import { sendChatPush } from "../push-notification.service";
import { assertChatShareAccess, publicReel, ReelSocialError } from "./access";

/** A normal text/link message remains readable by older chat clients. */
export async function shareReelToChat(
  reelId: string,
  userId: string,
  conversationId: string,
  id: string,
  db: typeof prisma = prisma,
) {
  const result = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Conversation" WHERE id = ${conversationId} FOR UPDATE`;
    const conversation = await tx.conversation.findUnique({
      where: { id: conversationId },
      select: {
        type: true,
        name: true,
        participants: { select: { userId: true, status: true } },
      },
    });
    assertChatShareAccess(userId, conversation);
    const reel = await publicReel(reelId, tx);
    const link = `https://mgl-api.onrender.com/api/reels/${encodeURIComponent(reelId)}`;
    const existing = await tx.directMessage.findUnique({ where: { id } });
    if (existing) {
      if (
        existing.senderId !== userId ||
        existing.conversationId !== conversationId ||
        !existing.content.endsWith(`\n${link}`)
      )
        throw new ReelSocialError(409, "Илгээх хүсэлт давхардлаа.");
      return {
        message: existing,
        fresh: false,
        conversationName: conversation?.name,
      };
    }
    const message = await tx.directMessage.create({
      data: {
        id,
        conversationId,
        senderId: userId,
        type: "TEXT",
        content: `🎬 ${reel.title || "Reel"}\n${link}`,
      },
    });
    await tx.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: message.createdAt },
    });
    await tx.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: message.createdAt },
    });
    await tx.reel.update({
      where: { id: reelId },
      data: { shareCount: { increment: 1 } },
    });
    return { message, fresh: true, conversationName: conversation?.name };
  });
  if (result.fresh) {
    void db.user
      .findUnique({
        where: { id: userId },
        select: { profile: { select: { fullName: true } } },
      })
      .then((user) =>
        sendChatPush({
          senderId: userId,
          senderName: user?.profile?.fullName || "Хэрэглэгч",
          conversationId,
          conversationName:
            result.conversationName || user?.profile?.fullName || "Шинэ reel",
          messageId: result.message.id,
          messageType: "TEXT",
          content: result.message.content,
          isCall: false,
        }),
      )
      .catch(() => console.error("[reel-share] push delivery failed"));
  }
  return {
    id: result.message.id,
    conversationId,
    content: result.message.content,
    createdAt: result.message.createdAt,
    isOwn: true,
    type: "TEXT",
  };
}
