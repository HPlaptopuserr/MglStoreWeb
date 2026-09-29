import { prisma, type Prisma } from "@mgl/database";
import { publicReelAccess } from "../reel-access-policy";

export class ReelSocialError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function publicReel(
  id: string,
  db: Pick<Prisma.TransactionClient, "reel"> = prisma,
) {
  const reel = await db.reel.findFirst({
    where: { id, ...publicReelAccess },
    select: {
      id: true,
      title: true,
      organizationId: true,
      likeCount: true,
      commentCount: true,
      shareCount: true,
    },
  });
  if (!reel)
    throw new ReelSocialError(
      404,
      "Reel олдсонгүй эсвэл нийтэд харагдахгүй байна.",
    );
  return reel;
}

export async function reelSocialSummary(id: string, userId?: string) {
  const reel = await publicReel(id);
  const liked = userId
    ? await prisma.reelInteraction.findFirst({
        where: { reelId: id, userId, type: "LIKE" },
        select: { id: true },
      })
    : null;
  return {
    likeCount: reel.likeCount,
    commentCount: reel.commentCount,
    shareCount: reel.shareCount,
    liked: !!liked,
  };
}

export function assertChatShareAccess(
  userId: string,
  conversation: {
    type: string;
    participants: Array<{ userId: string; status: string }>;
  } | null,
) {
  if (
    !conversation?.participants.some(
      (p) => p.userId === userId && p.status === "ACCEPTED",
    )
  ) {
    throw new ReelSocialError(403, "Энэ чатын гишүүн биш байна.");
  }
  if (
    conversation.type === "DIRECT" &&
    conversation.participants.some((p) => p.status !== "ACCEPTED")
  ) {
    throw new ReelSocialError(
      403,
      "Нөгөө хүн чатын хүсэлтийг зөвшөөрсний дараа илгээнэ.",
    );
  }
}
