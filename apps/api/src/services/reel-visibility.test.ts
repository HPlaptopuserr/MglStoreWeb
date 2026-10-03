import assert from "node:assert/strict";
import test from "node:test";
import { reelListAccess, publicReelAccess } from "./reel-access-policy";
import { withPrivateReelPlayback } from "./private-reel-storage.service";

test("public lists and direct lookup cannot expose private or pending reels", () => {
  assert.equal(reelListAccess({ authorId: "someone" }).visibility, "PUBLIC");
  assert.equal(reelListAccess({}).reviewStatus, "APPROVED");
  assert.equal(reelListAccess({ includePrivate: true }).visibility, "PUBLIC");
  assert.equal(
    reelListAccess({ includePrivate: true, authorId: "someone" }).visibility,
    "PUBLIC",
  );
  const owner = reelListAccess({
    includePrivate: true,
    authorId: "owner",
    organizationId: null,
    includePending: true,
  });
  assert.deepEqual(owner.visibility, { in: ["PUBLIC", "PRIVATE"] });
  assert.equal(owner.authorId, "owner");
  assert.equal(owner.organizationId, null);
  assert.equal(publicReelAccess.visibility, "PUBLIC");
  assert.equal(publicReelAccess.reviewStatus, "APPROVED");
});

test("private playback fails closed when a public storage bucket is supplied", async () => {
  await assert.rejects(
    withPrivateReelPlayback({
      visibility: "PRIVATE",
      storageBucket: "reels",
      storagePath: "users/test/video.mp4",
      videoUrl: "https://media.example/public.mp4",
    }),
    /not configured/,
  );
});
