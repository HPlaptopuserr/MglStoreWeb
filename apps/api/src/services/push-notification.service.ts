import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { prisma } from "@mgl/database";

type ChatPush = {
  senderId: string;
  senderName: string;
  conversationId: string;
  conversationName: string;
  messageId: string;
  messageType: string;
  content: string;
  isCall: boolean;
};

function initializeFirebase(): boolean {
  if (getApps().length > 0) return true;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return false;
  try {
    initializeApp({ credential: cert(JSON.parse(raw)) });
    return true;
  } catch (error) {
    console.error("Firebase Admin initialization failed", error);
    return false;
  }
}

export async function sendChatPush(input: ChatPush): Promise<void> {
  if (!initializeFirebase()) return;

  const recipients = await prisma.conversationParticipant.findMany({
    where: {
      conversationId: input.conversationId,
      userId: { not: input.senderId },
      status: "ACCEPTED",
    },
    select: { userId: true },
  });
  if (recipients.length === 0) return;

  const registrations = await prisma.pushToken.findMany({
    where: { userId: { in: recipients.map((item) => item.userId) } },
    select: { token: true },
  });
  if (registrations.length === 0) return;

  const title = input.isCall
    ? `${input.senderName} залгаж байна`
    : input.conversationName;
  const body = input.isCall
    ? "Incoming дуудлага"
    : input.messageType === "VOICE"
      ? "🎤 Дуут мессеж"
      : input.messageType === "IMAGE"
        ? "📷 Зураг"
        : input.messageType === "FILE"
          ? "📎 Файл"
          : input.content;

  const response = await getMessaging().sendEachForMulticast({
    tokens: registrations.map((item) => item.token),
    notification: { title, body },
    data: {
      type: input.isCall ? "incoming_call" : "chat_message",
      conversationId: input.conversationId,
      conversationName: input.conversationName,
      messageId: input.messageId,
    },
    android: {
      priority: "high",
      notification: {
        channelId: input.isCall
          ? "incoming_calls"
          : "chat_messages_high_v2",
        sound: "default",
        priority: "high",
        visibility: "public",
      },
    },
  });

  const invalidTokens = response.responses.flatMap((result, index) => {
    const code = result.error?.code;
    return code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-registration-token"
      ? [registrations[index].token]
      : [];
  });
  if (invalidTokens.length > 0) {
    await prisma.pushToken.deleteMany({ where: { token: { in: invalidTokens } } });
  }
}
