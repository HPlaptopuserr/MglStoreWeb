import { Router, type Router as ExpressRouter } from "express";
import crypto from "crypto";
import path from "path";
import multer from "multer";
import * as XLSX from "xlsx";
import {
  prisma,
  OnboardingSource,
  OrgStatus,
  OrgType,
  PlatformRole,
} from "@mgl/database";
import type { Prisma } from "@mgl/database";
import bcrypt from "bcryptjs";
import { Permission } from "@mgl/types";
import { requireAuth, requirePlatformPermission, requireAnyPlatformPermission, type AuthPayload } from "../../middleware/auth";
import { getSupabase, ORG_IMAGES_BUCKET } from "../../lib/supabase";

const router: ExpressRouter = Router();

const orgImportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/vnd.oasis.opendocument.spreadsheet",
      "text/csv",
    ];
    const ext = file.originalname.toLowerCase();
    cb(null, allowed.includes(file.mimetype) || ext.endsWith(".xlsx") || ext.endsWith(".xls") || ext.endsWith(".ods") || ext.endsWith(".csv"));
  },
});

const orgImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    cb(null, allowed.includes(file.mimetype));
  },
});

const categoryLabels: Record<string, string> = {
  retail: "Худалдаа",
  service: "Үйлчилгээ",
  food: "Хоол үйлдвэрлэл",
  other: "Бусад",
};

// 500m radius validation removed - branches can now be located at any distance
const VENDOR_APP_URL =
  process.env.VENDOR_APP_URL || "https://vendor.mglstore.mn";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function generateUniqueOrganizationSlug(name: string): Promise<string> {
  const baseSlug = slugify(name) || "organization";
  let slug = baseSlug;
  let counter = 0;

  while (true) {
    const exists = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!exists) return slug;

    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }
}

async function generateUniqueTaxId(prefix = "TEMP"): Promise<string> {
  let taxId = `${prefix}-${Date.now()}`;

  while (true) {
    const exists = await prisma.organization.findUnique({
      where: { taxId },
      select: { id: true },
    });

    if (!exists) return taxId;

    taxId = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }
}

function generateInviteToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function getInviteTokenExpiry(): Date {
  const now = new Date();
  now.setHours(now.getHours() + 24);
  return now;
}

function normalizeEmail(value?: string | null): string | null {
  const raw = value?.trim().toLowerCase();
  if (!raw || !raw.includes("@")) return null;
  return raw;
}

function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

// Grouped by businessCategory (must be before /partners to avoid Express matching issues)
router.post("/admin/organizations", requireAuth, requirePlatformPermission(Permission.MANAGE_ORGANIZATIONS), async (req, res) => {
  try {
    const {
      name,
      ownerEmail,
      ownerName,
      phone,
      address,
      type,
      businessCategory,
      taxId,
    } = req.body as {
      name?: string;
      ownerEmail?: string;
      ownerName?: string;
      phone?: string;
      address?: string;
      type?: string;
      businessCategory?: string;
      taxId?: string;
    };

    if (!name?.trim()) {
      return res.status(400).json({ message: "Байгууллагын нэр шаардлагатай" });
    }

    const normalizedEmail = normalizeEmail(ownerEmail);
    if (ownerEmail && !normalizedEmail) {
      return res.status(400).json({ message: "Owner email зөв форматтай байх ёстой" });
    }

    const slug = await generateUniqueOrganizationSlug(name);
    const resolvedTaxId = taxId?.trim() || (await generateUniqueTaxId("TEMP"));

    if (!normalizedEmail) {
      const organization = await prisma.organization.create({
        data: {
          name: name.trim(),
          slug,
          taxId: resolvedTaxId,
          type:
            type && Object.values(OrgType).includes(type as OrgType)
              ? (type as OrgType)
              : OrgType.SUPPLIER,
          status: OrgStatus.ACTIVE,
          email: null,
          phone: phone?.trim() || null,
          address: address?.trim() || null,
          businessCategory: businessCategory?.trim() || null,
          isVerified: false,
        },
        select: { id: true, name: true, slug: true, taxId: true },
      });
      return res.status(201).json({ organization, user: null, inviteToken: null, inviteLink: null });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (existingUser) {
      const hasOrg = await prisma.organizationMember.findFirst({
        where: { userId: existingUser.id, isActive: true },
        select: { id: true },
      });
      if (hasOrg) {
        return res.status(409).json({
          message: "Энэ email дээр user аль хэдийн өөр байгууллагад бүртгэлтэй байна",
        });
      }
    }

    if (existingUser?.passwordHash) {
      return res.status(409).json({
        message: "Энэ email дээр user аль хэдийн бүртгэлтэй байна. Өөр email ашиглана уу.",
      });
    }

    const inviteToken = generateInviteToken();
    const inviteTokenExpiresAt = getInviteTokenExpiry();

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const organization = await tx.organization.create({
        data: {
          name: name.trim(),
          slug,
          taxId: resolvedTaxId,
          type:
            type && Object.values(OrgType).includes(type as OrgType)
              ? (type as OrgType)
              : OrgType.SUPPLIER,
          status: OrgStatus.ACTIVE,
          email: normalizedEmail,
          phone: phone?.trim() || null,
          address: address?.trim() || null,
          businessCategory: businessCategory?.trim() || null,
          isVerified: false,
          // ─── Auto-activate 14-day trial ──────────────────────────
          subdomainEnabled: true,
          planType: "trial",
          planActivatedAt: new Date(),
          planExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          trialUsed: true,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          taxId: true,
        },
      });

      const user = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              role: PlatformRole.USER,
              isActive: true,
              emailVerified: true,
              onboardingSource: OnboardingSource.ADMIN,
            },
            select: {
              id: true,
              email: true,
              role: true,
            },
          })
        : await tx.user.create({
            data: {
              email: normalizedEmail,
              role: PlatformRole.USER,
              isActive: true,
              emailVerified: true,
              onboardingSource: OnboardingSource.ADMIN,
            },
            select: {
              id: true,
              email: true,
              role: true,
            },
          });

      await tx.profile.upsert({
        where: { userId: user.id },
        update: {
          fullName: ownerName?.trim() || name.trim(),
          phoneNumber: phone?.trim() || null,
        },
        create: {
          userId: user.id,
          fullName: ownerName?.trim() || name.trim(),
          phoneNumber: phone?.trim() || null,
        },
      });

      await tx.vendorSetupToken.create({
        data: {
          userId: user.id,
          token: inviteToken,
          expiresAt: inviteTokenExpiresAt,
        },
      });

      await tx.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: "OWNER",
          isPrimary: true,
          isActive: true,
        },
      });

      return { organization, user };
    });

    return res.status(201).json({
      organization: result.organization,
      user: result.user,
      inviteToken,
      inviteTokenExpiresAt,
      inviteLink: `${VENDOR_APP_URL}/set-password?token=${inviteToken}`,
    });
  } catch (error) {
    console.error("create admin organization error", error);
    return res.status(500).json({ message: "Байгууллага үүсгэхэд алдаа гарлаа" });
  }
});

router.get("/partners/grouped", async (req, res) => {
  try {
    const partners = await prisma.organization.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        businessCategory: true,
      },
    });

    const activeCategories = await prisma.businessCategory.findMany({
      where: { isActive: true },
    });

    const categoryMap = new Map(activeCategories.map((c: (typeof activeCategories)[number]) => [c.slug, c.name]));

    const grouped: Record<
      string,
      {
        category: string;
        label: string;
        partners: {
          id: string;
          name: string;
          slug: string;
          logoUrl: string | null;
        }[];
      }
    > = {};

    for (const partner of partners) {
      const catSlugs = partner.businessCategory
        ? partner.businessCategory.split(",").filter(Boolean)
        : ["other"];
      for (const catSlug of catSlugs) {
        if (!grouped[catSlug]) {
          grouped[catSlug] = {
            category: catSlug,
            label: categoryMap.get(catSlug) || catSlug,
            partners: [],
          };
        }
        grouped[catSlug].partners.push({
          id: partner.id,
          name: partner.name,
          slug: partner.slug,
          logoUrl: partner.logoUrl,
        });
      }
    }

    res.json(Object.values(grouped));
  } catch (error) {
    console.error("get grouped partners error", error);
    res.status(500).json({
      message: "Бүлэглэсэн түншүүдийг авахад алдаа гарлаа",
    });
  }
});

// Toggle investor role for a partner
router.patch("/partners/:id/investor", requireAuth, requirePlatformPermission(Permission.MANAGE_INVESTORS), async (req, res) => {
  try {
    const { id } = req.params;
    const { isInvestor, investmentAmount, addAmount } = req.body;

    const org = await prisma.organization.findUnique({
      where: { id },
      include: { investorProfile: true },
    });

    if (!org) {
      return res.status(404).json({ message: "Байгууллага олдсонгүй" });
    }

    if (isInvestor) {
      if (org.investorProfile) {
        let newLevel = org.investorProfile.investmentLevel;
        if (addAmount && investmentAmount) {
          const current = Number(org.investorProfile.investmentLevel) || 0;
          newLevel = String(current + Number(investmentAmount));
        } else if (investmentAmount) {
          newLevel = String(investmentAmount);
        }
        await prisma.investorProfile.update({
          where: { organizationId: id },
          data: { investmentLevel: newLevel },
        });
      } else {
        // Create investor profile
        await prisma.investorProfile.create({
          data: {
            organizationId: id,
            investmentLevel: investmentAmount ? String(investmentAmount) : null,
          },
        });
      }
    } else {
      // Remove investor profile
      if (org.investorProfile) {
        await prisma.investorProfile.delete({
          where: { organizationId: id },
        });
      }
    }

    const updated = await prisma.organization.findUnique({
      where: { id },
      include: {
        investorProfile: true,
        _count: { select: { members: true, products: true, branches: true, orders: true } },
      },
    });

    res.json({
      id: updated!.id,
      name: updated!.name,
      isInvestor: !!updated!.investorProfile,
      investmentAmount: updated!.investorProfile?.investmentLevel ? Number(updated!.investorProfile.investmentLevel) : null,
    });
  } catch (error) {
    console.error("toggle investor error", error);
    res.status(500).json({ message: "Хөрөнгө оруулагч төлөв өөрчлөхөд алдаа гарлаа" });
  }
});

// PATCH /admin/partners/:id/subdomain — admin manually toggle subdomain
router.patch(
  "/admin/partners/:id/subdomain",
  requireAuth,
  requireAnyPlatformPermission(Permission.MANAGE_ORGANIZATIONS),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { enabled } = req.body as { enabled: boolean };

      const org = await (prisma.organization.findUnique as any)({
        where: { id },
        select: { id: true, slug: true, subdomainEnabled: true },
      });
      if (!org) return res.status(404).json({ message: "Байгууллага олдсонгүй" });

      const now = new Date();
      const expiresAt = enabled ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) : null;

      await (prisma.organization.update as any)({
        where: { id },
        data: {
          subdomainEnabled: enabled,
          planActivatedAt: enabled ? now : null,
          planExpiresAt: expiresAt,
        },
      });

      return res.json({
        success: true,
        subdomainEnabled: enabled,
        subdomain: `${org.slug}.mglstore.mn`,
        planExpiresAt: expiresAt,
      });
    } catch (error) {
      console.error("subdomain toggle error", error);
      return res.status(500).json({ message: "Subdomain өөрчлөхөд алдаа гарлаа" });
    }
  },
);

router.get("/partners", async (req, res) => {
  try {
    const PAGE_LIMIT = 16;
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(10000, Math.max(1, parseInt(String(req.query.limit || PAGE_LIMIT), 10) || PAGE_LIMIT));
    const search = String(req.query.search || "").trim();
    const statusFilter = String(req.query.status || "").trim();
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (statusFilter) where.status = statusFilter;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { taxId: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, partners] = await prisma.$transaction([
      prisma.organization.count({ where }),
      prisma.organization.findMany({
        where,
        orderBy: [
          // Investors always first — DB-level approximation; fine-sort in JS below
          { createdAt: "desc" },
        ],
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              members: true,
              products: true,
              branches: true,
              orders: true,
            },
          },
          investorProfile: {
            select: {
              id: true,
              tier: true,
              featured: true,
              investmentLevel: true,
              publiclyVisible: true,
            },
          },
        },
      }),
    ]);

    const result = partners.map((partner: any) => ({
      id: partner.id,
      name: partner.name,
      slug: partner.slug,
      taxId: partner.taxId,
      type: partner.type,
      status: partner.status,
      isVerified: partner.isVerified,
      businessCategory: partner.businessCategory,
      email: partner.email,
      phone: partner.phone,
      logoUrl: partner.logoUrl,
      bannerUrl: partner.bannerUrl,
      address: partner.address,
      description: partner.description,
      shortDescription: partner.shortDescription,
      openingHours: partner.openingHours,
      deliveryText: partner.deliveryText,
      deliveryPrice: partner.deliveryPrice,
      rating: partner.rating,
      reviewCount: partner.reviewCount,
      customers: partner.customerCount,
      years: partner.operatingYears,
      createdAt: partner.createdAt,
      isInvestor: !!partner.investorProfile,
      investorTier: partner.investorProfile?.tier || null,
      investmentAmount: partner.investorProfile?.investmentLevel
        ? Number(partner.investorProfile.investmentLevel)
        : null,
      subdomainEnabled: partner.subdomainEnabled,
      planActivatedAt: partner.planActivatedAt,
      planExpiresAt: partner.planExpiresAt,
      stats: {
        users: partner._count.members,
        products: partner._count.products,
        branches: partner._count.branches,
        orders: partner._count.orders,
      },
    }));

    // Sort investors first within the current page
    result.sort((a: any, b: any) => {
      if (a.isInvestor && !b.isInvestor) return -1;
      if (!a.isInvestor && b.isInvestor) return 1;
      if (a.isInvestor && b.isInvestor) {
        return (b.investmentAmount || 0) - (a.investmentAmount || 0);
      }
      return 0;
    });

    res.json({
      data: result,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("get partners error", error);
    res.status(500).json({
      message: "Түншүүдийг авахад алдаа гарлаа",
    });
  }
});

// GET /partners/:id — fetch a single partner by ID
router.get("/partners/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const partner = await prisma.organization.findUnique({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: {
            members: true,
            products: true,
            branches: true,
            orders: true,
          },
        },
        investorProfile: {
          select: {
            id: true,
            tier: true,
            featured: true,
            investmentLevel: true,
            publiclyVisible: true,
          },
        },
      },
    });

    if (!partner) {
      return res.status(404).json({ message: "Байгууллага олдсонгүй" });
    }

    return res.json({
      id: partner.id,
      name: partner.name,
      slug: partner.slug,
      taxId: partner.taxId,
      type: partner.type,
      status: partner.status,
      isVerified: partner.isVerified,
      businessCategory: partner.businessCategory,
      email: partner.email,
      phone: partner.phone,
      logoUrl: partner.logoUrl,
      bannerUrl: partner.bannerUrl,
      address: partner.address,
      description: partner.description,
      shortDescription: partner.shortDescription,
      openingHours: partner.openingHours,
      deliveryText: partner.deliveryText,
      deliveryPrice: partner.deliveryPrice,
      rating: partner.rating,
      reviewCount: partner.reviewCount,
      customers: (partner as any).customerCount,
      years: partner.operatingYears,
      createdAt: partner.createdAt,
      isInvestor: !!partner.investorProfile,
      investorTier: partner.investorProfile?.tier || null,
      investmentAmount: partner.investorProfile?.investmentLevel
        ? Number(partner.investorProfile.investmentLevel)
        : null,
      subdomainEnabled: partner.subdomainEnabled,
      planActivatedAt: partner.planActivatedAt,
      planExpiresAt: partner.planExpiresAt,
      stats: {
        users: partner._count.members,
        products: partner._count.products,
        branches: partner._count.branches,
        orders: partner._count.orders,
      },
    });
  } catch (error) {
    console.error("get partner by id error", error);
    return res.status(500).json({ message: "Байгууллагын мэдээлэл авахад алдаа гарлаа" });
  }
});

// ─── HR / Staff endpoints ────────────────────────────────────────────────────

const VALID_STAFF_ROLES = ["OWNER", "ADMIN", "STAFF", "VIEWER"] as const;
type StaffRole = (typeof VALID_STAFF_ROLES)[number];

const ROLE_LABEL: Record<StaffRole, string> = {
  OWNER: "Эзэмшигч",
  ADMIN: "Менежер",
  STAFF: "Ажилтан",
  VIEWER: "Ажиглагч",
};

// GET /admin/organizations/:id/staff
router.get("/admin/organizations/:id/staff", requireAuth, requireAnyPlatformPermission(Permission.MANAGE_ORGANIZATIONS, Permission.MANAGE_USERS), async (req, res) => {
  const { id: organizationId } = req.params;
  try {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        isActive: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            profile: { select: { fullName: true, phoneNumber: true } },
          },
        },
      },
    });
    return res.json(
      members.map((m: (typeof members)[number]) => ({
        id: m.id,
        userId: m.user.id,
        email: m.user.email,
        fullName: m.user.profile?.fullName || "",
        phone: m.user.profile?.phoneNumber || null,
        role: m.role,
        roleLabel: ROLE_LABEL[m.role as StaffRole] ?? m.role,
        isActive: m.isActive,
        createdAt: m.createdAt,
      })),
    );
  } catch (error) {
    console.error("list staff error", error);
    return res.status(500).json({ message: "Ажилтнуудын жагсаалт авахад алдаа гарлаа" });
  }
});

// POST /admin/organizations/:id/staff — create a new staff member
router.post("/admin/organizations/:id/staff", requireAuth, requireAnyPlatformPermission(Permission.MANAGE_ORGANIZATIONS, Permission.MANAGE_USERS), async (req, res) => {
  const { id: organizationId } = req.params;
  const { fullName, email, phone, password, role } = req.body as {
    fullName?: string;
    email?: string;
    phone?: string;
    password?: string;
    role?: string;
  };

  if (!fullName?.trim()) {
    return res.status(400).json({ message: "Нэр шаардлагатай" });
  }
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return res.status(400).json({ message: "Имэйл зөв форматтай байх ёстой" });
  }
  const memberRole: StaffRole = VALID_STAFF_ROLES.includes(role as StaffRole)
    ? (role as StaffRole)
    : "STAFF";

  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });
    if (!org) return res.status(404).json({ message: "Байгууллага олдсонгүй" });

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      const alreadyMember = await prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId: existingUser.id, organizationId } },
      });
      if (alreadyMember) {
        return res.status(409).json({ message: "Энэ хэрэглэгч аль хэдийн тухайн байгууллагад бүртгэлтэй байна" });
      }
    }

    const passwordHash = password?.trim()
      ? await bcrypt.hash(password.trim(), 10)
      : null;

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = existingUser
        ? existingUser
        : await tx.user.create({
            data: {
              email: normalizedEmail,
              role: PlatformRole.USER,
              isActive: true,
              emailVerified: true,
              onboardingSource: OnboardingSource.ADMIN,
              ...(passwordHash ? { passwordHash } : {}),
            },
            select: { id: true },
          });

      await tx.profile.upsert({
        where: { userId: user.id },
        update: { fullName: fullName.trim(), phoneNumber: phone?.trim() || null },
        create: { userId: user.id, fullName: fullName.trim(), phoneNumber: phone?.trim() || null },
      });

      const member = await tx.organizationMember.create({
        data: {
          userId: user.id,
          organizationId,
          role: memberRole,
          isActive: true,
        },
      });

      if (passwordHash && existingUser) {
        await tx.user.update({
          where: { id: user.id },
          data: { passwordHash },
        });
      }

      return { userId: user.id, memberId: member.id };
    });

    return res.status(201).json({
      memberId: result.memberId,
      userId: result.userId,
      email: normalizedEmail,
      fullName: fullName.trim(),
      role: memberRole,
      roleLabel: ROLE_LABEL[memberRole],
    });
  } catch (error) {
    console.error("create staff error", error);
    return res.status(500).json({ message: "Ажилтан бүртгэхэд алдаа гарлаа" });
  }
});

// PATCH /admin/organizations/:id/staff/:memberId/toggle — toggle active
router.patch("/admin/organizations/:id/staff/:memberId/toggle", requireAuth, requireAnyPlatformPermission(Permission.MANAGE_ORGANIZATIONS, Permission.MANAGE_USERS), async (req, res) => {
  const { memberId } = req.params;
  try {
    const member = await prisma.organizationMember.findUnique({ where: { id: memberId } });
    if (!member) return res.status(404).json({ message: "Гишүүн олдсонгүй" });
    const updated = await prisma.organizationMember.update({
      where: { id: memberId },
      data: { isActive: !member.isActive },
      select: { id: true, isActive: true },
    });
    return res.json(updated);
  } catch (error) {
    console.error("toggle staff error", error);
    return res.status(500).json({ message: "Идэвхжүүлэхэд алдаа гарлаа" });
  }
});

// DELETE /admin/organizations/:id/staff/:memberId
router.delete("/admin/organizations/:id/staff/:memberId", requireAuth, requireAnyPlatformPermission(Permission.MANAGE_ORGANIZATIONS, Permission.MANAGE_USERS), async (req, res) => {
  const { memberId } = req.params;
  try {
    await prisma.organizationMember.delete({ where: { id: memberId } });
    return res.json({ success: true });
  } catch (error) {
    console.error("delete staff error", error);
    return res.status(500).json({ message: "Ажилтан устгахад алдаа гарлаа" });
  }
});

// GET /admin/branches?organizationId= — list branches for a given org
router.get("/admin/branches", requireAuth, async (req, res) => {
  const organizationId = String(req.query.organizationId || "").trim();
  if (!organizationId) {
    return res.status(400).json({ message: "organizationId шаардлагатай" });
  }
  try {
    const branches = await prisma.branch.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, address: true },
    });
    return res.json(branches);
  } catch (error) {
    console.error("list admin branches error", error);
    return res.status(500).json({ message: "Салбарын жагсаалт авахад алдаа гарлаа" });
  }
});

router.get("/branches/map", async (_req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      where: {
        deletedAt: null,
        lat: { not: null },
        lng: { not: null },
        organization: {
          deletedAt: null,
          status: "ACTIVE",
        },
      },
      orderBy: [{ organizationId: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        address: true,
        lat: true,
        lng: true,
        organizationId: true,
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

    res.json(branches);
  } catch (error) {
    console.error("get branch map data error", error);
    res.status(500).json({ message: "Салбарын байршлын мэдээлэл авахад алдаа гарлаа" });
  }
});

router.post("/partners/:id/branches", requireAuth, requirePlatformPermission(Permission.MANAGE_ORGANIZATIONS), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, lat, lng } = req.body as {
      name?: string;
      address?: string;
      lat?: number | string;
      lng?: number | string;
    };

    if (!name?.trim() || !address?.trim()) {
      return res.status(400).json({ message: "Салбарын нэр болон хаяг заавал шаардлагатай" });
    }

    const organization = await prisma.organization.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!organization) {
      return res.status(404).json({ message: "Байгууллага олдсонгүй" });
    }

    const parsedLat = lat === undefined || lat === null || lat === "" ? null : Number(lat);
    const parsedLng = lng === undefined || lng === null || lng === "" ? null : Number(lng);

    if ((parsedLat !== null && Number.isNaN(parsedLat)) || (parsedLng !== null && Number.isNaN(parsedLng))) {
      return res.status(400).json({ message: "Өргөрөг/уртраг зөв тоо байх ёстой" });
    }

    // 500m radius validation removed - branches can now be located at any distance

    const created = await prisma.branch.create({
      data: {
        organizationId: id,
        name: name.trim(),
        address: address.trim(),
        lat: parsedLat,
        lng: parsedLng,
      },
      select: {
        id: true,
        name: true,
        address: true,
        lat: true,
        lng: true,
        createdAt: true,
      },
    });

    res.status(201).json(created);
  } catch (error) {
    console.error("create branch error", error);
    res.status(500).json({ message: "Салбар үүсгэхэд алдаа гарлаа" });
  }
});

// Get single partner by slug or id
router.get("/partners/:slugOrId", async (req, res) => {
  try {
    const { slugOrId } = req.params;

    const partner = await prisma.organization.findFirst({
      where: {
        OR: [{ slug: slugOrId }, { id: slugOrId }],
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            members: true,
            products: true,
            branches: true,
            orders: true,
          },
        },
        investorProfile: {
          select: {
            id: true,
            tier: true,
            featured: true,
            investmentLevel: true,
            publiclyVisible: true,
          },
        },
        members: {
          where: { isActive: true },
          select: {
            id: true,
            role: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                email: true,
                isActive: true,
                lastLoginAt: true,
                profile: { select: { fullName: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        products: {
          where: {
            isActive: true,
            deletedAt: null,
          },
          include: {
            images: true,
            category: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        branches: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            address: true,
            lat: true,
            lng: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!partner) {
      return res.status(404).json({ message: "Түнш олдсонгүй" });
    }

    const result = {
      id: partner.id,
      name: partner.name,
      slug: partner.slug,
      taxId: partner.taxId,
      type: partner.type,
      status: partner.status,
      isVerified: partner.isVerified,
      businessCategory: partner.businessCategory,
      email: partner.email,
      phone: partner.phone,
      logoUrl: partner.logoUrl,
      bannerUrl: partner.bannerUrl,
      address: partner.address,
      description: partner.description,
      shortDescription: partner.shortDescription,
      openingHours: partner.openingHours,
      deliveryText: partner.deliveryText,
      deliveryPrice: partner.deliveryPrice,
      rating: partner.rating,
      reviewCount: partner.reviewCount,
      customers: partner.customerCount,
      years: partner.operatingYears,
      createdAt: partner.createdAt,
      isInvestor: !!partner.investorProfile,
      investorTier: partner.investorProfile?.tier || null,
      investmentAmount: partner.investorProfile?.investmentLevel ? Number(partner.investorProfile.investmentLevel) : null,
      subdomainEnabled: partner.subdomainEnabled,
      planActivatedAt: partner.planActivatedAt,
      planExpiresAt: partner.planExpiresAt,
      stats: {
        users: partner._count.members,
        products: partner._count.products,
        branches: partner._count.branches,
        orders: partner._count.orders,
      },
      members: partner.members.map((m: any) => ({
        id: m.id,
        role: m.role,
        createdAt: m.createdAt,
        userId: m.user.id,
        email: m.user.email,
        fullName: m.user.profile?.fullName || null,
        isActive: m.user.isActive,
        lastLoginAt: m.user.lastLoginAt,
      })),
      products: partner.products.map((p: any) => ({
        id: p.id,
        name: p.name,
        title: p.name,
        description: p.description,
        price: Number(p.price),
        originalPrice: p.costPrice ? Number(p.costPrice) : undefined,
        stock: p.stock,
        category: p.category?.name,
        image: p.images?.[0]?.url,
        images: p.images?.map((img: any) => img.url),
      })),
      branches: partner.branches.map((b: any) => ({
        id: b.id,
        name: b.name,
        address: b.address,
        lat: b.lat,
        lng: b.lng,
        createdAt: b.createdAt,
      })),
    };

    res.json(result);
  } catch (error) {
    console.error("get partner detail error", error);
    res.status(500).json({
      message: "Түншийн мэдээлэл авахад алдаа гарлаа",
    });
  }
});

/* ─── POST /partners/:id/members/:userId/reset-password ─────────────── */
router.post("/partners/:id/members/:userId/reset-password", requireAuth, requirePlatformPermission(Permission.MANAGE_ORGANIZATIONS), async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });

    // Generate an 8-char temporary password: letters + digits
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    const tempPassword = Array.from({ length: 8 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");

    const hash = await bcrypt.hash(tempPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash },
    });

    return res.json({ tempPassword });
  } catch (error) {
    console.error("reset password error", error);
    return res.status(500).json({ message: "Нууц үг шинэчлэхэд алдаа гарлаа" });
  }
});

router.patch("/partners/:id/category", requireAuth, requirePlatformPermission(Permission.MANAGE_ORGANIZATIONS), async (req, res) => {
  try {
    const { id } = req.params;
    const { businessCategory } = req.body;

    const updated = await prisma.organization.update({
      where: { id },
      data: { businessCategory: businessCategory || null },
      select: { id: true, name: true, businessCategory: true },
    });

    res.json(updated);
  } catch (error) {
    console.error("update businessCategory error", error);
    res
      .status(500)
      .json({ message: "BusinessCategory шинэчлэхэд алдаа гарлаа" });
  }
});

// Upload organization image (logo or cover)
router.post("/partners/upload-image", requireAuth, orgImageUpload.single("image"), async (req, res) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (!req.file) {
      return res.status(400).json({ message: "Зураг файл шаардлагатай" });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ message: "Supabase тохиргоо хийгдээгүй байна" });
    }

    const ext = path.extname(req.file.originalname).toLowerCase() || ".jpg";
    const fileName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
    const filePath = `organizations/${fileName}`;

    const { error } = await getSupabase().storage
      .from(ORG_IMAGES_BUCKET)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error("org image upload error", error);
      return res.status(500).json({ message: "Зураг upload хийхэд алдаа гарлаа", error: error.message });
    }

    const { data: publicUrlData } = getSupabase().storage
      .from(ORG_IMAGES_BUCKET)
      .getPublicUrl(filePath);

    return res.json({ url: publicUrlData.publicUrl });
  } catch (error) {
    console.error("org image upload error", error);
    return res.status(500).json({ message: "Зураг upload хийхэд алдаа гарлаа", error: String(error) });
  }
});

// Update partner profile (vendor can update own org, admin can update any)
router.patch("/partners/:id/profile", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user as AuthPayload;

    // Allow if admin OR if user belongs to this organization
    const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
    if (!isAdmin) {
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: user.userId, organizationId: id },
        select: { id: true },
      });
      if (!membership) {
        return res.status(403).json({ message: "Энэ байгууллагын мэдээллийг засах эрхгүй байна" });
      }
    }

    const {
      name,
      phone,
      email,
      address,
      logoUrl,
      bannerUrl,
      description,
      shortDescription,
      openingHours,
      deliveryText,
      deliveryPrice,
      operatingYears,
    } = req.body;

    const updateData: Record<string, any> = {};

    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (address !== undefined) updateData.address = address;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl;
    if (description !== undefined) updateData.description = description;
    if (shortDescription !== undefined)
      updateData.shortDescription = shortDescription;
    if (openingHours !== undefined) updateData.openingHours = openingHours;
    if (deliveryText !== undefined) updateData.deliveryText = deliveryText;
    if (deliveryPrice !== undefined) updateData.deliveryPrice = deliveryPrice;
    if (operatingYears !== undefined)
      updateData.operatingYears = operatingYears;

    const updated = await prisma.organization.update({
      where: { id },
      data: updateData,
    });

    res.json({
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      phone: updated.phone,
      email: updated.email,
      address: updated.address,
      logoUrl: updated.logoUrl,
      bannerUrl: updated.bannerUrl,
      description: updated.description,
      shortDescription: updated.shortDescription,
      openingHours: updated.openingHours,
      deliveryText: updated.deliveryText,
      deliveryPrice: updated.deliveryPrice,
      operatingYears: updated.operatingYears,
    });
  } catch (error) {
    console.error("update partner profile error", error);
    res.status(500).json({ message: "Профайл шинэчлэхэд алдаа гарлаа" });
  }
});

// Get deleted organizations (trash)
router.get("/partners/deleted/list", async (req, res) => {
  try {
    const deletedOrgs = await prisma.organization.findMany({
      where: {
        deletedAt: { not: null },
      },
      orderBy: {
        deletedAt: "desc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        deletedAt: true,
        deletionReason: true,
        deletedBy: true,
        scheduledPermanentDeletionAt: true,
        _count: {
          select: {
            members: true,
            products: true,
            orders: true,
          },
        },
      },
    });

    res.json(deletedOrgs);
  } catch (error) {
    console.error("get deleted organizations error", error);
    res
      .status(500)
      .json({ message: "Устгасан байгууллагуудыг авахад алдаа гарлаа" });
  }
});

// Delete organization (soft delete with reason, 30 days retention)
router.delete("/partners/:id", requireAuth, requirePlatformPermission(Permission.MANAGE_ORGANIZATIONS), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, deletedBy } = req.body;

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
        message: "Устгах шалтгааныг дор хаяж 5 тэмдэгтээр бичнэ үү",
      });
    }

    // Check if organization exists
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: true,
            products: true,
            members: true,
          },
        },
      },
    });

    if (!org) {
      return res.status(404).json({ message: "Байгууллага олдсонгүй" });
    }

    // Calculate 30 days from now for permanent deletion
    const scheduledPermanentDeletionAt = new Date();
    scheduledPermanentDeletionAt.setDate(
      scheduledPermanentDeletionAt.getDate() + 30,
    );

    // Soft delete - set deletedAt timestamp
    await prisma.organization.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletionReason: reason.trim(),
        deletedBy: deletedBy || "admin",
        scheduledPermanentDeletionAt,
        status: "SUSPENDED",
      },
    });

    // Also deactivate all members of this organization
    await prisma.organizationMember.updateMany({
      where: { organizationId: id },
      data: {
        isActive: false,
      },
    });

    res.json({
      success: true,
      message:
        "Байгууллага амжилттай устгагдлаа. 30 хоногийн дараа бүрмөсөн устгагдана.",
      deletedOrg: {
        id: org.id,
        name: org.name,
        scheduledPermanentDeletionAt,
      },
    });
  } catch (error) {
    console.error("delete organization error", error);
    res.status(500).json({ message: "Байгууллага устгахад алдаа гарлаа" });
  }
});

// Restore deleted organization
router.post("/partners/:id/restore", requireAuth, requirePlatformPermission(Permission.MANAGE_ORGANIZATIONS), async (req, res) => {
  try {
    const { id } = req.params;

    const org = await prisma.organization.findUnique({
      where: { id },
    });

    if (!org) {
      return res.status(404).json({ message: "Байгууллага олдсонгүй" });
    }

    if (!org.deletedAt) {
      return res
        .status(400)
        .json({ message: "Энэ байгууллага устгагдаагүй байна" });
    }

    // Restore organization
    await prisma.organization.update({
      where: { id },
      data: {
        deletedAt: null,
        deletionReason: null,
        deletedBy: null,
        scheduledPermanentDeletionAt: null,
        status: "ACTIVE",
      },
    });

    // Restore members
    await prisma.organizationMember.updateMany({
      where: { organizationId: id },
      data: {
        isActive: true,
      },
    });

    res.json({
      success: true,
      message: "Байгууллага амжилттай сэргээгдлээ",
      restoredOrg: {
        id: org.id,
        name: org.name,
      },
    });
  } catch (error) {
    console.error("restore organization error", error);
    res.status(500).json({ message: "Байгууллага сэргээхэд алдаа гарлаа" });
  }
});

// Permanently delete organization (only after 30 days or by force)
router.delete("/partners/:id/permanent", requireAuth, requirePlatformPermission(Permission.MANAGE_ORGANIZATIONS), async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.body;

    const org = await prisma.organization.findUnique({
      where: { id },
    });

    if (!org) {
      return res.status(404).json({ message: "Байгууллага олдсонгүй" });
    }

    if (!org.deletedAt) {
      return res.status(400).json({
        message: "Зөвхөн устгагдсан байгууллагыг бүрмөсөн устгах боломжтой",
      });
    }

    // Check if 30 days have passed (unless force is true)
    if (
      !force &&
      org.scheduledPermanentDeletionAt &&
      new Date() < org.scheduledPermanentDeletionAt
    ) {
      const daysLeft = Math.ceil(
        (org.scheduledPermanentDeletionAt.getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      );
      return res.status(400).json({
        message: `Бүрмөсөн устгах хугацаа болоогүй байна. ${daysLeft} хоног үлдсэн.`,
      });
    }

    // Permanently delete (cascade will handle related records based on schema)
    await prisma.organization.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Байгууллага бүрмөсөн устгагдлаа",
    });
  } catch (error) {
    console.error("permanent delete organization error", error);
    res
      .status(500)
      .json({ message: "Байгууллага бүрмөсөн устгахад алдаа гарлаа" });
  }
});

/* ─── GET /admin/organizations/import-template ──────────────────────── */
router.get(
  "/admin/organizations/import-template",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_ORGANIZATIONS),
  (_req, res) => {
    try {
      const templateData = [
        {
          "Овог, нэр": "Ванчигийн Даваабаатар",
          "Байгууллагын нэр (name)": "Зандан хүрэн тэмээт хоршоо",
          "Байгууллагын регистрийн дугаар": "3262804",
          "Байгууллагын төрөл (Олон сонголттой)": "Үйлдвэрлэгч, Хүнсний дэлгүүр / жижиглэн худалдаа",
          "Хаяг (аймаг/дүүрэг, хороо)": "Говь Алтай аймаг Төгрөг сум",
          "Утасны дугаар": "99042553",
          "И-мэйл хаяг": "davaa5482@gmail.com",
        },
        {
          "Овог, нэр": "Батын Болд",
          "Байгууллагын нэр (name)": "Монгол Органик ХХК",
          "Байгууллагын регистрийн дугаар": "1234567",
          "Байгууллагын төрөл (Олон сонголттой)": "Үйлдвэрлэгч",
          "Хаяг (аймаг/дүүрэг, хороо)": "Улаанбаатар, Баянзүрх дүүрэг",
          "Утасны дугаар": "88001122",
          "И-мэйл хаяг": "bold@example.mn",
        },
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      ws["!cols"] = [
        { wch: 24 }, { wch: 30 }, { wch: 26 }, { wch: 38 },
        { wch: 28 }, { wch: 14 }, { wch: 24 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Байгууллагууд");

      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Disposition", 'attachment; filename="organization_import_template.xlsx"');
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      return res.send(Buffer.from(buf));
    } catch (error) {
      console.error("org template download error", error);
      return res.status(500).json({ message: "Template татахад алдаа гарлаа" });
    }
  },
);

/* ─── POST /admin/organizations/import ─────────────────────────────── */
router.post(
  "/admin/organizations/import",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_ORGANIZATIONS),
  orgImportUpload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Excel/ODS файл шаардлагатай" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return res.status(400).json({ message: "Файл хоосон байна" });
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName]);
      if (!rows.length) {
        return res.status(400).json({ message: "Файлд мэдээлэл олдсонгүй" });
      }

      if (rows.length > 200) {
        return res.status(400).json({ message: "Нэг удаад 200-аас олон байгууллага оруулах боломжгүй" });
      }

      // Column name mapping — exact match to the ODS template
      const colMap = {
        ownerFullName:    ["Овог, нэр", "ownerFullName", "Овог нэр"],
        name:             ["Байгууллагын нэр (name)", "name", "Нэр", "нэр", "Байгууллагын нэр", "Компаний нэр"],
        taxId:            ["Байгууллагын регистрийн дугаар", "taxId", "Татварын дугаар", "РД", "Регистрийн дугаар"],
        type:             ["Байгууллагын төрөл (Олон сонголттой)", "type", "Төрөл", "төрөл"],
        address:          ["Хаяг (аймаг/дүүрэг, хороо)", "address", "Хаяг", "хаяг"],
        phone:            ["Утасны дугаар", "phone", "Утас", "утас"],
        ownerEmail:       ["И-мэйл хаяг", "ownerEmail", "email", "Email", "И-мэйл"],
      };

      const normalizeHeader = (value: string) =>
        value.trim().replace(/\s+/g, " ").toLowerCase();

      const resolveCol = (row: Record<string, unknown>, keys: string[]): unknown => {
        const normalizedKeys = new Set(keys.map(normalizeHeader));
        for (const [rawKey, value] of Object.entries(row)) {
          if (!normalizedKeys.has(normalizeHeader(rawKey))) continue;
          if (value !== undefined && value !== null && String(value).trim() !== "") return value;
        }
        return undefined;
      };

      const results: {
        created: number;
        skipped: number;
        errors: Array<{ row: number; name: string; reason: string }>;
        organizations: Array<{ id: string; name: string; email: string; inviteLink: string }>;
      } = { created: 0, skipped: 0, errors: [], organizations: [] };

      // Pre-check for duplicates within the file
      const emailsInFile = new Map<string, number>();
      const namesInFile = new Map<string, number>();
      const duplicateRowIndexes = new Set<number>();
      for (let i = 0; i < rows.length; i++) {
        const email = resolveCol(rows[i], colMap.ownerEmail);
        const name = resolveCol(rows[i], colMap.name);
        if (email) {
          const normalized = String(email).trim().toLowerCase();
          if (emailsInFile.has(normalized)) {
            results.errors.push({
              row: i + 2,
              name: name ? String(name).trim() : "(нэргүй)",
              reason: `Email "${normalized}" файл дотор давхардсан (мөр ${emailsInFile.get(normalized)})`,
            });
            duplicateRowIndexes.add(i);
          } else {
            emailsInFile.set(normalized, i + 2);
          }
        }
        if (name) {
          const normalized = String(name).trim().toLowerCase();
          if (namesInFile.has(normalized)) {
            // Allow duplicate names within file but warn
          }
          namesInFile.set(normalized, i + 2);
        }
      }

      // Track emails already processed in this batch to skip in-file duplicates
      const processedEmails = new Set<string>();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        const name = resolveCol(row, colMap.name);
        const ownerEmail = resolveCol(row, colMap.ownerEmail);
        const ownerFullName = resolveCol(row, colMap.ownerFullName);
        const phone = resolveCol(row, colMap.phone);
        const address = resolveCol(row, colMap.address);
        const type = resolveCol(row, colMap.type);
        const taxId = resolveCol(row, colMap.taxId);

        const orgName = name ? String(name).trim() : "";
        const emailStr = ownerEmail ? String(ownerEmail).trim().toLowerCase() : "";

        if (duplicateRowIndexes.has(i)) {
          results.skipped++;
          continue;
        }

        // Validation
        if (!orgName) {
          results.errors.push({ row: rowNum, name: "(хоосон)", reason: "Байгууллагын нэр заавал шаардлагатай" });
          results.skipped++;
          continue;
        }

        if (!emailStr || !emailStr.includes("@")) {
          results.errors.push({ row: rowNum, name: orgName, reason: "Owner email буруу эсвэл хоосон" });
          results.skipped++;
          continue;
        }

        // Skip if already processed in this batch (in-file duplicate)
        if (processedEmails.has(emailStr)) {
          continue; // Already reported as duplicate
        }
        processedEmails.add(emailStr);

        // Check existing user with active org
        const existingUser = await prisma.user.findUnique({
          where: { email: emailStr },
          select: { id: true, passwordHash: true },
        });

        if (existingUser?.passwordHash) {
          results.errors.push({
            row: rowNum,
            name: orgName,
            reason: `Email "${emailStr}" дээр нууц үгтэй хэрэглэгч бүртгэлтэй байна`,
          });
          results.skipped++;
          continue;
        }

        if (existingUser) {
          const hasOrg = await prisma.organizationMember.findFirst({
            where: { userId: existingUser.id, isActive: true },
            select: { id: true },
          });
          if (hasOrg) {
            results.errors.push({
              row: rowNum,
              name: orgName,
              reason: `Email "${emailStr}" дээр аль хэдийн өөр байгууллагад бүртгэлтэй`,
            });
            results.skipped++;
            continue;
          }
        }

        // Check duplicate organization by name
        const existingOrg = await prisma.organization.findFirst({
          where: { name: { equals: orgName, mode: "insensitive" }, deletedAt: null },
          select: { id: true, name: true },
        });
        if (existingOrg) {
          results.errors.push({
            row: rowNum,
            name: orgName,
            reason: `"${existingOrg.name}" нэртэй байгууллага аль хэдийн бүртгэлтэй`,
          });
          results.skipped++;
          continue;
        }

        // Check duplicate by taxId. taxId is globally unique, including soft-deleted organizations.
        const resolvedTaxId = taxId ? String(taxId).trim() : null;
        if (resolvedTaxId) {
          const existingTax = await prisma.organization.findFirst({
            where: { taxId: resolvedTaxId },
            select: { id: true, name: true, deletedAt: true },
          });
          if (existingTax) {
            results.errors.push({
              row: rowNum,
              name: orgName,
              reason: existingTax.deletedAt
                ? `Татварын дугаар "${resolvedTaxId}" устгагдсан "${existingTax.name}" байгууллагад бүртгэлтэй байна. Сэргээх эсвэл бүрмөсөн устгаад дахин импорт хийнэ үү.`
                : `Татварын дугаар "${resolvedTaxId}" "${existingTax.name}" байгууллагад бүртгэлтэй`,
            });
            results.skipped++;
            continue;
          }
        }

        // Create organization + user + invite
        try {
          const slug = await generateUniqueOrganizationSlug(orgName);
          const finalTaxId = resolvedTaxId || await generateUniqueTaxId("TEMP");
          const inviteToken = generateInviteToken();
          const inviteTokenExpiresAt = getInviteTokenExpiry();

          const orgType =
            type && Object.values(OrgType).includes(String(type).trim() as OrgType)
              ? (String(type).trim() as OrgType)
              : (() => {
                  // Map Mongolian type names to enum
                  const typeStr = type ? String(type).toLowerCase() : "";
                  if (typeStr.includes("үйлдвэрлэгч")) return OrgType.SUPPLIER;
                  if (typeStr.includes("дэлгүүр") || typeStr.includes("худалдаа")) return OrgType.VENDOR;
                  if (typeStr.includes("бизнес") || typeStr.includes("customer")) return OrgType.BUSINESS_CUSTOMER;
                  return OrgType.SUPPLIER;
                })();

          const resolvedOwnerName = ownerFullName
            ? String(ownerFullName).trim()
            : orgName;

          const resolvedPhone = phone
            ? String(phone).trim()
            : null;

          const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const organization = await tx.organization.create({
              data: {
                name: orgName,
                slug,
                taxId: finalTaxId,
                type: orgType,
                status: OrgStatus.ACTIVE,
                email: emailStr,
                phone: resolvedPhone,
                address: address ? String(address).trim() : null,
                isVerified: false,
              },
              select: { id: true, name: true },
            });

            const user = existingUser
              ? await tx.user.update({
                  where: { id: existingUser.id },
                  data: {
                    role: PlatformRole.USER,
                    isActive: true,
                    emailVerified: true,
                    onboardingSource: OnboardingSource.ADMIN,
                  },
                  select: { id: true, email: true },
                })
              : await tx.user.create({
                  data: {
                    email: emailStr,
                    role: PlatformRole.USER,
                    isActive: true,
                    emailVerified: true,
                    onboardingSource: OnboardingSource.ADMIN,
                  },
                  select: { id: true, email: true },
                });

            await tx.profile.upsert({
              where: { userId: user.id },
              update: {
                fullName: resolvedOwnerName,
                phoneNumber: resolvedPhone,
              },
              create: {
                userId: user.id,
                fullName: resolvedOwnerName,
                phoneNumber: resolvedPhone,
              },
            });

            await tx.vendorSetupToken.create({
              data: {
                userId: user.id,
                token: inviteToken,
                expiresAt: inviteTokenExpiresAt,
              },
            });

            await tx.organizationMember.create({
              data: {
                userId: user.id,
                organizationId: organization.id,
                role: "OWNER",
                isPrimary: true,
                isActive: true,
              },
            });

            return { organization, user };
          });

          results.organizations.push({
            id: result.organization.id,
            name: result.organization.name,
            email: result.user.email,
            inviteLink: `${VENDOR_APP_URL}/set-password?token=${inviteToken}`,
          });
          results.created++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const maybePrisma = err as { code?: string; meta?: { target?: unknown } };
          let reason = msg;
          if (maybePrisma?.code === "P2002") {
            const target = Array.isArray(maybePrisma.meta?.target)
              ? maybePrisma.meta?.target.join(",")
              : String(maybePrisma.meta?.target || "");
            reason = target.includes("taxId")
              ? "Татварын дугаар давхардсан"
              : target.includes("slug")
                ? "Байгууллагын нэр давхардсан"
                : target.includes("email")
                  ? "Email давхардсан"
                  : `Давхардсан утга (${target})`;
          }
          results.errors.push({ row: rowNum, name: orgName, reason });
          results.skipped++;
        }
      }

      return res.json({
        message: `${results.created} байгууллага амжилттай бүртгэгдлээ`,
        total: rows.length,
        ...results,
      });
    } catch (error) {
      console.error("import organizations error", error);
      return res.status(500).json({ message: "Импорт хийхэд алдаа гарлаа", error: String(error) });
    }
  },
);

export default router;
