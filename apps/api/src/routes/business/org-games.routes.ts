import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import { requireAuth, type AuthPayload } from "../../middleware/auth";

const router: ExpressRouter = Router();
const supportedGames = new Set(["2048", "block-blast"]);

const membershipFor = (userId: string, organizationId: string) =>
  prisma.organizationMember.findFirst({
    where: { userId, organizationId, isActive: true, deletedAt: null },
    select: { id: true },
  });

router.get("/org/games/:game/leaderboard", requireAuth, async (req, res) => {
  const actor = (req as typeof req & { user: AuthPayload }).user;
  const game = String(req.params.game || "");
  const organizationId = String(req.query.organizationId || "");
  if (!organizationId || !supportedGames.has(game)) return res.status(400).json({ message: "Тоглоом эсвэл байгууллага буруу байна" });
  if (!(await membershipFor(actor.userId, organizationId))) {
    return res.status(403).json({ message: "Leaderboard харах эрхгүй байна" });
  }
  const scores = await prisma.organizationGameScore.findMany({
    where: { organizationId, game },
    orderBy: [{ score: "desc" }, { moves: "asc" }, { durationMs: "asc" }],
    take: 50,
    select: {
      userId: true, score: true, maxTile: true, moves: true, durationMs: true, updatedAt: true,
      user: { select: { profile: { select: { fullName: true, avatarUrl: true } } } },
    },
  });
  return res.json(scores.map((item, index) => ({
    rank: index + 1,
    userId: item.userId,
    fullName: item.user.profile?.fullName || "Ажилтан",
    avatarUrl: item.user.profile?.avatarUrl || null,
    score: item.score,
    maxTile: item.maxTile,
    moves: item.moves,
    durationMs: item.durationMs,
    achievedAt: item.updatedAt,
  })));
});

router.post("/org/games/:game/scores", requireAuth, async (req, res) => {
  const actor = (req as typeof req & { user: AuthPayload }).user;
  const game = String(req.params.game || "");
  const organizationId = String(req.body.organizationId || "");
  const score = Number(req.body.score);
  const maxTile = Number(req.body.maxTile);
  const moves = Number(req.body.moves);
  const durationMs = Number(req.body.durationMs);
  const validTile = Number.isInteger(maxTile) && maxTile >= 2 && (maxTile & (maxTile - 1)) === 0;
  if (!supportedGames.has(game) || !organizationId || !Number.isInteger(score) || score < 0 || score > 10000000 ||
      !validTile || !Number.isInteger(moves) || moves < 1 || moves > 1000000 ||
      !Number.isInteger(durationMs) || durationMs < 1000 || durationMs > 86400000) {
    return res.status(400).json({ message: "Тоглолтын үр дүн буруу байна" });
  }
  if (!(await membershipFor(actor.userId, organizationId))) {
    return res.status(403).json({ message: "Оноо хадгалах эрхгүй байна" });
  }
  const key = { organizationId, userId: actor.userId, game };
  const existing = await prisma.organizationGameScore.findUnique({
    where: { organizationId_userId_game: key },
  });
  if (existing && existing.score >= score) return res.json({ saved: false, best: existing });
  const best = await prisma.organizationGameScore.upsert({
    where: { organizationId_userId_game: key },
    create: { ...key, score, maxTile, moves, durationMs },
    update: { score, maxTile, moves, durationMs },
  });
  return res.json({ saved: true, best });
});

export default router;
