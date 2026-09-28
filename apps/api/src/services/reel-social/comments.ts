import { prisma, Prisma } from "@mgl/database";
import { publicReel, ReelSocialError } from "./access";

const commentInclude = {
  user: {
    select: {
      id: true,
      profile: { select: { fullName: true, avatarUrl: true } },
    },
  },
} satisfies Prisma.ReelInteractionInclude;
type Comment = Prisma.ReelInteractionGetPayload<{
  include: typeof commentInclude;
}>;
function view(row: Comment, userId?: string) {
  const metadata = row.metadata;
  const text =
    metadata &&
    typeof metadata === "object" &&
    !Array.isArray(metadata) &&
    typeof metadata.text === "string"
      ? metadata.text
      : "";
  return {
    id: row.id,
    text,
    createdAt: row.createdAt,
    authorId: row.userId,
    authorName: row.user?.profile?.fullName || "Хэрэглэгч",
    avatarUrl: row.user?.profile?.avatarUrl ?? null,
    isOwn: row.userId === userId,
  };
}

export async function listReelComments(
  reelId: string,
  userId?: string,
  cursor?: string,
) {
  await publicReel(reelId);
  const rows = await prisma.reelInteraction.findMany({
    where: {
      reelId,
      type: "COMMENT",
      metadata: { path: ["text"], not: Prisma.JsonNull },
    },
    include: commentInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 31,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const items = rows.slice(0, 30);
  return {
    items: items.map((r) => view(r, userId)),
    nextCursor: rows.length > 30 ? items.at(-1)?.id : null,
  };
}

export async function addReelComment(
  reelId: string,
  userId: string,
  id: string,
  text: string,
  db: typeof prisma = prisma,
) {
  return db.$transaction(async (tx) => {
    // Serializes retries and counter updates for this reel.
    await tx.$queryRaw`SELECT id FROM "Reel" WHERE id = ${reelId} FOR UPDATE`;
    const reel = await publicReel(reelId, tx);
    const existing = await tx.reelInteraction.findUnique({
      where: { id },
      include: commentInclude,
    });
    if (existing) {
      if (
        existing.reelId !== reelId ||
        existing.userId !== userId ||
        existing.type !== "COMMENT"
      )
        throw new ReelSocialError(409, "Сэтгэгдлийн хүсэлт давхардлаа.");
      return view(existing, userId);
    }
    const row = await tx.reelInteraction.create({
      data: {
        id,
        reelId,
        userId,
        organizationId: reel.organizationId,
        type: "COMMENT",
        source: "mgl_store",
        metadata: { text },
      },
      include: commentInclude,
    });
    await tx.reel.update({
      where: { id: reelId },
      data: { commentCount: { increment: 1 } },
    });
    return view(row, userId);
  });
}

export async function deleteReelComment(
  reelId: string,
  userId: string,
  id: string,
) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Reel" WHERE id = ${reelId} FOR UPDATE`;
    const reel = await publicReel(reelId, tx);
    const removed = await tx.reelInteraction.deleteMany({
      where: { id, reelId, userId, type: "COMMENT" },
    });
    if (removed.count)
      await tx.reel.update({
        where: { id: reelId },
        data: { commentCount: { decrement: Math.min(1, reel.commentCount) } },
      });
    return { ok: true };
  });
}
