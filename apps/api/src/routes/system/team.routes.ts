import { Router, type Router as ExpressRouter } from "express";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import { prisma } from "@mgl/database";
import { requireAuth, requirePlatformPermission } from "../../middleware/auth";
import { Permission } from "@mgl/types";
import { getSupabase, ORG_IMAGES_BUCKET } from "../../lib/supabase";

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype));
  },
});

const router: ExpressRouter = Router();
const TEAM_DEPARTMENTS_KEY = "teamDepartments";
const DEFAULT_TEAM_DEPARTMENTS = [
  "Үүсгэн байгуулагчид",
  "Хөрөнгө оруулагчид",
  "Зөвлөхүүд",
  "Захиргаа удирдлагын хэлтэс",
  "Бүтээгдэхүүн хөгжүүлэлтийн хэлтэс",
  "Технологийн хэлтэс",
  "Маркетинг борлуулалтын хэлтэс",
  "Үйл ажиллагааны хэлтэс",
  "Санхүүгийн хэлтэс",
];
const PLATFORM_ROLE_LABELS: Record<
  string,
  { role: string; department: string; order: number }
> = {
  SUPER_ADMIN: {
    role: "Ерөнхий админ",
    department: "Захиргаа удирдлагын хэлтэс",
    order: 1000,
  },
  ADMIN: {
    role: "Админ",
    department: "Захиргаа удирдлагын хэлтэс",
    order: 1001,
  },
  HR_ADMIN: {
    role: "Хүний нөөц",
    department: "Захиргаа удирдлагын хэлтэс",
    order: 1002,
  },
  CONTENT_ADMIN: {
    role: "Контент менежер",
    department: "Маркетинг борлуулалтын хэлтэс",
    order: 1003,
  },
  PARTNER_ADMIN: {
    role: "Түнш менежер",
    department: "Маркетинг борлуулалтын хэлтэс",
    order: 1004,
  },
  WAREHOUSE_ADMIN: {
    role: "Агуулахын менежер",
    department: "Үйл ажиллагааны хэлтэс",
    order: 1005,
  },
  FINANCE_ADMIN: {
    role: "Санхүүгийн менежер",
    department: "Санхүүгийн хэлтэс",
    order: 1006,
  },
  SERVICE_ADMIN: {
    role: "Үйлчилгээний менежер",
    department: "Харилцагчийн үйлчилгээний хэлтэс",
    order: 1007,
  },
  LAWYER: {
    role: "Хуульч",
    department: "Захиргаа удирдлагын хэлтэс",
    order: 1008,
  },
};

function uniqueDepartments(values: unknown[]) {
  const seen = new Set<string>();
  return values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

async function getStoredDepartments() {
  const setting = await prisma.siteSetting.findUnique({
    where: { key: TEAM_DEPARTMENTS_KEY },
  });

  if (!setting?.value) return DEFAULT_TEAM_DEPARTMENTS;

  try {
    const parsed = JSON.parse(setting.value);
    if (!Array.isArray(parsed)) return DEFAULT_TEAM_DEPARTMENTS;
    return uniqueDepartments(parsed);
  } catch {
    return DEFAULT_TEAM_DEPARTMENTS;
  }
}

async function saveDepartments(departments: string[]) {
  const clean = uniqueDepartments(departments);
  await prisma.siteSetting.upsert({
    where: { key: TEAM_DEPARTMENTS_KEY },
    update: { value: JSON.stringify(clean) },
    create: { key: TEAM_DEPARTMENTS_KEY, value: JSON.stringify(clean) },
  });
  return clean;
}

async function getDepartmentRows() {
  const [storedDepartments, members] = await Promise.all([
    getStoredDepartments(),
    (prisma as any).teamMember.findMany({
      select: { department: true },
    }),
  ]);
  const counts = new Map<string, number>();
  const memberDepartments = uniqueDepartments(
    members.map((member: { department?: string | null }) => member.department),
  );

  for (const member of members as { department?: string | null }[]) {
    const department = member.department?.trim();
    if (department) counts.set(department, (counts.get(department) ?? 0) + 1);
  }

  return uniqueDepartments([...storedDepartments, ...memberDepartments]).map(
    (name) => ({
      name,
      count: counts.get(name) ?? 0,
    }),
  );
}

// Public: list active team members
router.get("/team", async (_req, res) => {
  try {
    const [members, users] = await Promise.all([
      (prisma as any).teamMember.findMany({
        where: { isActive: true },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      }),
      prisma.user.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          role: { not: "USER" },
        },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          profile: {
            select: {
              fullName: true,
              avatarUrl: true,
              phoneNumber: true,
            },
          },
        },
      }),
    ]);

    const memberEmails = new Set(
      (members as Array<{ email?: string | null }>)
        .map((member) => member.email)
        .filter(Boolean),
    );
    const userMembers = users
      .filter((user) => !memberEmails.has(user.email))
      .map((user) => {
        const meta = PLATFORM_ROLE_LABELS[user.role] ?? {
          role: user.role,
          department: "Ерөнхий баг",
          order: 1099,
        };

        return {
          id: `user-${user.id}`,
          name: user.profile?.fullName || user.email,
          role: meta.role,
          department: meta.department,
          bio: null,
          avatarUrl: user.profile?.avatarUrl ?? null,
          email: user.email,
          phoneNumber: user.profile?.phoneNumber ?? null,
          linkedinUrl: null,
          experience: null,
          skills: [user.role],
          order: meta.order,
          isActive: true,
          createdAt: user.createdAt,
          updatedAt: user.createdAt,
        };
      });

    res.json([...members, ...userMembers].sort((a, b) => a.order - b.order));
  } catch {
    res.status(500).json({ message: "Серверийн алдаа" });
  }
});

// Admin: list all (including inactive)
router.get(
  "/admin/team",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_SITE_SETTINGS),
  async (_req, res) => {
    try {
      const members = await (prisma as any).teamMember.findMany({
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      });
      res.json(members);
    } catch {
      res.status(500).json({ message: "Серверийн алдаа" });
    }
  },
);

router.get(
  "/admin/team/departments",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_SITE_SETTINGS),
  async (_req, res) => {
    try {
      res.json(await getDepartmentRows());
    } catch {
      res
        .status(500)
        .json({ message: "Хэлтсийн мэдээлэл авахад алдаа гарлаа" });
    }
  },
);

router.post(
  "/admin/team/departments",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_SITE_SETTINGS),
  async (req, res) => {
    try {
      const name =
        typeof req.body?.name === "string" ? req.body.name.trim() : "";
      if (!name)
        return res.status(400).json({ message: "Хэлтсийн нэр шаардлагатай" });

      const departments = await getStoredDepartments();
      if (!departments.includes(name)) {
        await saveDepartments([...departments, name]);
      }

      res.status(201).json(await getDepartmentRows());
    } catch {
      res.status(500).json({ message: "Хэлтэс нэмэхэд алдаа гарлаа" });
    }
  },
);

router.patch(
  "/admin/team/departments",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_SITE_SETTINGS),
  async (req, res) => {
    try {
      const from =
        typeof req.body?.from === "string" ? req.body.from.trim() : "";
      const to = typeof req.body?.to === "string" ? req.body.to.trim() : "";
      if (!from || !to)
        return res
          .status(400)
          .json({ message: "Хуучин болон шинэ нэр шаардлагатай" });

      const departments = await getStoredDepartments();
      await saveDepartments(
        departments.map((department) =>
          department === from ? to : department,
        ),
      );
      await (prisma as any).teamMember.updateMany({
        where: { department: from },
        data: { department: to },
      });

      res.json(await getDepartmentRows());
    } catch {
      res.status(500).json({ message: "Хэлтсийн нэр солиход алдаа гарлаа" });
    }
  },
);

router.delete(
  "/admin/team/departments",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_SITE_SETTINGS),
  async (req, res) => {
    try {
      const name =
        typeof req.body?.name === "string" ? req.body.name.trim() : "";
      if (!name)
        return res.status(400).json({ message: "Хэлтсийн нэр шаардлагатай" });

      const departments = await getStoredDepartments();
      await saveDepartments(
        departments.filter((department) => department !== name),
      );
      await (prisma as any).teamMember.updateMany({
        where: { department: name },
        data: { department: null },
      });

      res.json(await getDepartmentRows());
    } catch {
      res.status(500).json({ message: "Хэлтэс устгахад алдаа гарлаа" });
    }
  },
);

// Admin: create
router.post(
  "/admin/team",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_SITE_SETTINGS),
  async (req, res) => {
    try {
      const {
        name,
        role,
        department,
        bio,
        avatarUrl,
        email,
        phoneNumber,
        linkedinUrl,
        experience,
        skills,
        order,
      } = req.body as {
        name: string;
        role: string;
        department?: string;
        bio?: string;
        avatarUrl?: string;
        email?: string;
        phoneNumber?: string;
        linkedinUrl?: string;
        experience?: string;
        skills?: string[];
        order?: number;
      };

      if (!name?.trim() || !role?.trim()) {
        return res
          .status(400)
          .json({ message: "Нэр болон албан тушаал шаардлагатай" });
      }

      const member = await (prisma as any).teamMember.create({
        data: {
          name: name.trim(),
          role: role.trim(),
          department: department?.trim() || null,
          bio: bio?.trim() || null,
          avatarUrl: avatarUrl?.trim() || null,
          email: email?.trim() || null,
          phoneNumber: phoneNumber?.trim() || null,
          linkedinUrl: linkedinUrl?.trim() || null,
          experience: experience?.trim() || null,
          skills: Array.isArray(skills) ? skills.filter(Boolean) : [],
          order: order ?? 0,
        },
      });

      res.status(201).json(member);
    } catch {
      res.status(500).json({ message: "Серверийн алдаа" });
    }
  },
);

// Admin: update
router.put(
  "/admin/team/:id",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_SITE_SETTINGS),
  async (req, res) => {
    const { id } = req.params;
    try {
      const existing = await (prisma as any).teamMember.findUnique({
        where: { id },
      });
      if (!existing) return res.status(404).json({ message: "Олдсонгүй" });

      const {
        name,
        role,
        department,
        bio,
        avatarUrl,
        email,
        phoneNumber,
        linkedinUrl,
        experience,
        skills,
        order,
        isActive,
      } = req.body;

      const member = await (prisma as any).teamMember.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(role !== undefined && { role: role.trim() }),
          ...(department !== undefined && {
            department: department?.trim() || null,
          }),
          ...(bio !== undefined && { bio: bio?.trim() || null }),
          ...(avatarUrl !== undefined && {
            avatarUrl: avatarUrl?.trim() || null,
          }),
          ...(email !== undefined && { email: email?.trim() || null }),
          ...(phoneNumber !== undefined && {
            phoneNumber: phoneNumber?.trim() || null,
          }),
          ...(linkedinUrl !== undefined && {
            linkedinUrl: linkedinUrl?.trim() || null,
          }),
          ...(experience !== undefined && {
            experience: experience?.trim() || null,
          }),
          ...(skills !== undefined && {
            skills: Array.isArray(skills) ? skills.filter(Boolean) : [],
          }),
          ...(order !== undefined && { order }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      res.json(member);
    } catch {
      res.status(500).json({ message: "Серверийн алдаа" });
    }
  },
);

// Admin: delete
router.delete(
  "/admin/team/:id",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_SITE_SETTINGS),
  async (req, res) => {
    const { id } = req.params;
    try {
      await (prisma as any).teamMember.delete({ where: { id } });
      res.json({ success: true });
    } catch {
      res.status(404).json({ message: "Олдсонгүй" });
    }
  },
);

// Admin: upload avatar
router.post(
  "/admin/team/upload-avatar",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_SITE_SETTINGS),
  avatarUpload.single("avatar"),
  async (req, res) => {
    if (!req.file)
      return res.status(400).json({ message: "Зураг файл шаардлагатай" });
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ message: "Supabase тохиргоо хийгдээгүй" });
    }
    try {
      const ext = path.extname(req.file.originalname).toLowerCase() || ".jpg";
      const fileName = `team/${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
      const { error } = await getSupabase()
        .storage.from(ORG_IMAGES_BUCKET)
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });
      if (error)
        return res
          .status(500)
          .json({ message: "Upload алдаа", error: error.message });
      const { data } = getSupabase()
        .storage.from(ORG_IMAGES_BUCKET)
        .getPublicUrl(fileName);
      res.json({ url: data.publicUrl });
    } catch {
      res.status(500).json({ message: "Серверийн алдаа" });
    }
  },
);

export default router;
