import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";

const router: ExpressRouter = Router();

const TIER_LABELS: Record<string, string> = {
  TOP: "Top Investor",
  STRATEGIC: "Strategic Investor",
  INVESTOR: "Investor",
};

// Get all public investors (ordered by tier → priority → joinedAt)
router.get("/investors", async (req, res) => {
  try {
    const investors = await prisma.investorProfile.findMany({
      where: {
        publiclyVisible: true,
        organization: {
          status: "ACTIVE",
          deletedAt: null,
        },
      },
      orderBy: [
        { tier: "asc" }, // TOP first (alphabetical: I < S < T → reverse needed)
        { priority: "desc" },
        { joinedAt: "asc" },
      ],
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            bannerUrl: true,
            description: true,
            shortDescription: true,
          },
        },
      },
    });

    // Re-sort: TOP > STRATEGIC > INVESTOR
    const tierOrder = { TOP: 0, STRATEGIC: 1, INVESTOR: 2 };
    investors.sort((a, b) => {
      const tierDiff =
        (tierOrder[a.tier] ?? 2) - (tierOrder[b.tier] ?? 2);
      if (tierDiff !== 0) return tierDiff;
      return b.priority - a.priority;
    });

    const result = investors.map((inv) => ({
      id: inv.id,
      organizationId: inv.organization.id,
      name: inv.organization.name,
      slug: inv.organization.slug,
      logoUrl: inv.organization.logoUrl,
      bannerUrl: inv.organization.bannerUrl,
      description: inv.organization.shortDescription || inv.description,
      tier: inv.tier,
      tierLabel: TIER_LABELS[inv.tier] || "Investor",
      featured: inv.featured,
      investmentLevel: inv.investmentLevel,
      joinedAt: inv.joinedAt,
    }));

    res.json(result);
  } catch (error) {
    console.error("get investors error", error);
    res
      .status(500)
      .json({ message: "Хөрөнгө оруулагчдыг авахад алдаа гарлаа" });
  }
});

// Get featured investors (homepage section)
router.get("/investors/featured", async (req, res) => {
  try {
    const investors = await prisma.investorProfile.findMany({
      where: {
        featured: true,
        publiclyVisible: true,
        organization: {
          status: "ACTIVE",
          deletedAt: null,
        },
      },
      orderBy: [{ priority: "desc" }, { joinedAt: "asc" }],
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            bannerUrl: true,
            shortDescription: true,
          },
        },
      },
    });

    const tierOrder = { TOP: 0, STRATEGIC: 1, INVESTOR: 2 };
    investors.sort((a, b) => {
      const tierDiff =
        (tierOrder[a.tier] ?? 2) - (tierOrder[b.tier] ?? 2);
      if (tierDiff !== 0) return tierDiff;
      return b.priority - a.priority;
    });

    const result = investors.map((inv) => ({
      id: inv.id,
      organizationId: inv.organization.id,
      name: inv.organization.name,
      slug: inv.organization.slug,
      logoUrl: inv.organization.logoUrl,
      bannerUrl: inv.organization.bannerUrl,
      description: inv.organization.shortDescription || inv.description,
      tier: inv.tier,
      tierLabel: TIER_LABELS[inv.tier] || "Investor",
      featured: inv.featured,
      investmentLevel: inv.investmentLevel,
      joinedAt: inv.joinedAt,
    }));

    res.json(result);
  } catch (error) {
    console.error("get featured investors error", error);
    res
      .status(500)
      .json({ message: "Онцлох хөрөнгө оруулагчдыг авахад алдаа гарлаа" });
  }
});

// Admin: Get all investor profiles (including private)
router.get("/investors/all", async (req, res) => {
  try {
    const investors = await prisma.investorProfile.findMany({
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            status: true,
            isVerified: true,
          },
        },
      },
    });

    res.json(investors);
  } catch (error) {
    console.error("get all investors error", error);
    res.status(500).json({ message: "Алдаа гарлаа" });
  }
});

// Admin: Add investor role to an organization
router.post("/investors", async (req, res) => {
  try {
    const {
      organizationId,
      tier = "INVESTOR",
      featured = false,
      priority = 0,
      publiclyVisible = true,
      investmentLevel,
      description,
    } = req.body;

    if (!organizationId) {
      return res
        .status(400)
        .json({ message: "organizationId шаардлагатай" });
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return res.status(404).json({ message: "Байгууллага олдсонгүй" });
    }

    const existing = await prisma.investorProfile.findUnique({
      where: { organizationId },
    });

    if (existing) {
      return res
        .status(409)
        .json({ message: "Энэ байгууллага аль хэдийн хөрөнгө оруулагч юм" });
    }

    const investor = await prisma.investorProfile.create({
      data: {
        organizationId,
        tier,
        featured,
        priority,
        publiclyVisible,
        investmentLevel: investmentLevel || null,
        description: description || null,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
      },
    });

    res.status(201).json(investor);
  } catch (error) {
    console.error("create investor error", error);
    res
      .status(500)
      .json({ message: "Хөрөнгө оруулагч нэмэхэд алдаа гарлаа" });
  }
});

// Admin: Update investor profile
router.patch("/investors/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { tier, featured, priority, publiclyVisible, investmentLevel, description } =
      req.body;

    const updateData: Record<string, unknown> = {};
    if (tier !== undefined) updateData.tier = tier;
    if (featured !== undefined) updateData.featured = featured;
    if (priority !== undefined) updateData.priority = priority;
    if (publiclyVisible !== undefined) updateData.publiclyVisible = publiclyVisible;
    if (investmentLevel !== undefined)
      updateData.investmentLevel = investmentLevel || null;
    if (description !== undefined) updateData.description = description || null;

    const investor = await prisma.investorProfile.update({
      where: { id },
      data: updateData,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
      },
    });

    res.json(investor);
  } catch (error) {
    console.error("update investor error", error);
    res
      .status(500)
      .json({ message: "Хөрөнгө оруулагч шинэчлэхэд алдаа гарлаа" });
  }
});

// Admin: Remove investor role
router.delete("/investors/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.investorProfile.delete({
      where: { id },
    });

    res.json({ success: true, message: "Хөрөнгө оруулагч устгагдлаа" });
  } catch (error) {
    console.error("delete investor error", error);
    res
      .status(500)
      .json({ message: "Хөрөнгө оруулагч устгахад алдаа гарлаа" });
  }
});

export default router;
