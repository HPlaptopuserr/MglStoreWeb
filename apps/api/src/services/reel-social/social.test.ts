import assert from "node:assert/strict";
import { test } from "node:test";
import type { prisma, Prisma } from "@mgl/database";
import { publicReel, ReelSocialError } from "./access";
import { addReelComment } from "./comments";
import { shareReelToChat } from "./share";

type Db = typeof prisma;
const reel = {
  id: "reel",
  title: "Clip",
  organizationId: null,
  likeCount: 0,
  commentCount: 0,
  shareCount: 0,
};
function fakeDatabase({
  hidden = false,
  existingComment = false,
  existingShare = false,
} = {}) {
  let writes = 0;
  let filter: unknown;
  const comment = {
    id: "stable",
    reelId: "reel",
    userId: "author",
    type: "COMMENT",
    metadata: { text: "Hello" },
    createdAt: new Date(),
    user: { profile: { fullName: "Name", avatarUrl: null } },
  };
  const message = {
    id: "stable",
    senderId: "author",
    conversationId: "chat",
    content: "🎬 Clip\nhttps://mgl-api.onrender.com/api/reels/reel",
    createdAt: new Date(),
  };
  const tx = {
    $queryRaw: async () => [],
    reel: {
      findFirst: async (args: { where: unknown }) => {
        filter = args.where;
        return hidden ? null : reel;
      },
      update: async () => {
        writes++;
        return reel;
      },
    },
    reelInteraction: {
      findUnique: async () => (existingComment ? comment : null),
      create: async () => {
        writes++;
        return comment;
      },
    },
    conversation: {
      findUnique: async () => ({
        type: "DIRECT",
        name: null,
        participants: [
          { userId: "author", status: "ACCEPTED" },
          { userId: "friend", status: "ACCEPTED" },
        ],
      }),
    },
    directMessage: {
      findUnique: async () => (existingShare ? message : null),
      create: async () => {
        writes++;
        return message;
      },
    },
  };
  // Only the persistence boundary is faked; production policy and retry logic run.
  const db = {
    ...tx,
    $transaction: async (
      action: (tx: Prisma.TransactionClient) => Promise<unknown>,
    ) => action(tx as unknown as Prisma.TransactionClient),
  } as unknown as Db;
  return {
    db,
    get writes() {
      return writes;
    },
    get filter() {
      return filter;
    },
  };
}
test("public access always enforces ready, approved, public and non-deleted", async () => {
  const fake = fakeDatabase({ hidden: true });
  await assert.rejects(
    publicReel("private", fake.db),
    (error: unknown) =>
      error instanceof ReelSocialError && error.status === 404,
  );
  assert.deepEqual(fake.filter, {
    id: "private",
    deletedAt: null,
    status: "READY",
    visibility: "PUBLIC",
    reviewStatus: "APPROVED",
  });
});
test("comment retry returns the same comment without incrementing the counter", async () => {
  const fake = fakeDatabase({ existingComment: true });
  const comment = await addReelComment(
    "reel",
    "author",
    "stable",
    "Hello",
    fake.db,
  );
  assert.equal(comment.text, "Hello");
  assert.equal(comment.isOwn, true);
  assert.equal(fake.writes, 0);
  await assert.rejects(
    addReelComment("reel", "foreign", "stable", "Hello", fake.db),
    ReelSocialError,
  );
});
test("new comments are persisted and counted in the same transaction", async () => {
  const fake = fakeDatabase();
  await addReelComment("reel", "author", "stable", "Hello", fake.db);
  assert.equal(fake.writes, 2);
});
test("chat share retry reuses a message without another write or push", async () => {
  const fake = fakeDatabase({ existingShare: true });
  const response = await shareReelToChat(
    "reel",
    "author",
    "chat",
    "stable",
    fake.db,
  );
  assert.equal(response.id, "stable");
  assert.equal(fake.writes, 0);
});
test("private reels cannot be shared even by their owner", async () => {
  const fake = fakeDatabase({ hidden: true });
  await assert.rejects(
    shareReelToChat("private", "author", "chat", "id", fake.db),
    ReelSocialError,
  );
  assert.equal(fake.writes, 0);
});
