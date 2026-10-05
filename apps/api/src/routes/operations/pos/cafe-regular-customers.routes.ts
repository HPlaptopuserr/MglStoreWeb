import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import {
  normalizeCafeRegularCustomerDiscount,
  normalizeCafeRegularCustomerPhone,
} from "@mgl/types";
import {
  canAccessPosOrganization,
  requirePosUser,
  type AuthUser,
} from "./_shared";

const router: ExpressRouter = Router();

const cleanName = (value: unknown) => String(value ?? "").trim();

const isCafeCustomerManager = (actor: AuthUser) =>
  actor.role === "ADMIN" ||
  actor.role === "SUPER_ADMIN" ||
  actor.orgRole === "OWNER";

const resolveOrganizationId = (actor: AuthUser, value: unknown) => {
  const requested = String(value ?? "").trim();
  const organizationId = requested || actor.organizationId || "";
  return organizationId && canAccessPosOrganization(actor, organizationId)
    ? organizationId
    : null;
};

async function isCafeOrganization(organizationId: string) {
  const setting = await prisma.siteSetting.findUnique({
    where: { key: `self-service-mode-${organizationId}` },
    select: { value: true },
  });
  return (
    String(setting?.value ?? "")
      .trim()
      .toUpperCase() === "CAFE"
  );
}

const serializeCustomer = <
  T extends {
    discountPercent: unknown;
    lastUsedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    _count?: { sales: number };
  },
>(
  customer: T,
) => ({
  ...customer,
  discountPercent: Number(customer.discountPercent),
  lastUsedAt: customer.lastUsedAt?.toISOString() ?? null,
  createdAt: customer.createdAt.toISOString(),
  updatedAt: customer.updatedAt.toISOString(),
  saleCount: customer._count?.sales ?? 0,
  _count: undefined,
});

router.post("/pos/cafe-regular-customers/lookup", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const organizationId = resolveOrganizationId(
      actor,
      req.body?.organizationId,
    );
    if (!organizationId) {
      return res.status(403).json({ message: "Байгууллагын эрх хүрэлцэхгүй" });
    }
    if (!(await isCafeOrganization(organizationId))) {
      return res
        .status(403)
        .json({ message: "Кофе шопын горим идэвхгүй байна" });
    }

    const phone = normalizeCafeRegularCustomerPhone(req.body?.phone);
    if (!phone) {
      return res.status(400).json({ message: "Утасны дугаар 8 оронтой байна" });
    }

    const customer = await prisma.cafeRegularCustomer.findUnique({
      where: {
        organizationId_normalizedPhone: {
          organizationId,
          normalizedPhone: phone,
        },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        normalizedPhone: true,
        discountPercent: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!customer?.isActive) {
      return res.json({ found: false, phone });
    }

    return res.json({ found: true, customer: serializeCustomer(customer) });
  } catch (error) {
    console.error("POST /pos/cafe-regular-customers/lookup error", error);
    return res
      .status(500)
      .json({ message: "Байнгын хэрэглэгчийг шалгаж чадсангүй" });
  }
});

router.get("/pos/cafe-regular-customers", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;
    if (!isCafeCustomerManager(actor)) {
      return res.status(403).json({ message: "Зөвхөн эзэмшигч удирдана" });
    }

    const organizationId = resolveOrganizationId(
      actor,
      req.query.organizationId,
    );
    if (!organizationId) {
      return res.status(403).json({ message: "Байгууллагын эрх хүрэлцэхгүй" });
    }
    if (!(await isCafeOrganization(organizationId))) {
      return res
        .status(403)
        .json({ message: "Кофе шопын горим идэвхгүй байна" });
    }

    const search = String(req.query.search ?? "")
      .trim()
      .slice(0, 80);
    const searchDigits = search.replace(/\D/g, "");
    const customers = await prisma.cafeRegularCustomer.findMany({
      where: {
        organizationId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                ...(searchDigits
                  ? [{ normalizedPhone: { contains: searchDigits } }]
                  : []),
              ],
            }
          : {}),
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      take: 500,
      include: { _count: { select: { sales: true } } },
    });

    return res.json({
      customers: customers.map(serializeCustomer),
      total: customers.length,
    });
  } catch (error) {
    console.error("GET /pos/cafe-regular-customers error", error);
    return res
      .status(500)
      .json({ message: "Байнгын хэрэглэгчдийн жагсаалт авахад алдаа гарлаа" });
  }
});

router.post("/pos/cafe-regular-customers", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;
    if (!isCafeCustomerManager(actor)) {
      return res.status(403).json({ message: "Зөвхөн эзэмшигч бүртгэнэ" });
    }

    const organizationId = resolveOrganizationId(
      actor,
      req.body?.organizationId,
    );
    if (!organizationId) {
      return res.status(403).json({ message: "Байгууллагын эрх хүрэлцэхгүй" });
    }
    if (!(await isCafeOrganization(organizationId))) {
      return res
        .status(403)
        .json({ message: "Кофе шопын горим идэвхгүй байна" });
    }

    const name = cleanName(req.body?.name);
    const phone = normalizeCafeRegularCustomerPhone(req.body?.phone);
    const discountPercent = normalizeCafeRegularCustomerDiscount(
      req.body?.discountPercent,
    );
    if (name.length < 2 || name.length > 80) {
      return res
        .status(400)
        .json({ message: "Хэрэглэгчийн нэр 2-80 тэмдэгт байна" });
    }
    if (!phone) {
      return res.status(400).json({ message: "Утасны дугаар 8 оронтой байна" });
    }
    if (discountPercent === null) {
      return res.status(400).json({ message: "Хямдралын хувь 0-100 байна" });
    }

    const customer = await prisma.cafeRegularCustomer.create({
      data: {
        organizationId,
        name,
        phone,
        normalizedPhone: phone,
        discountPercent,
        createdById: actor.id,
      },
      include: { _count: { select: { sales: true } } },
    });
    return res.status(201).json(serializeCustomer(customer));
  } catch (error) {
    if ((error as { code?: string })?.code === "P2002") {
      return res
        .status(409)
        .json({ message: "Энэ утасны дугаар бүртгэлтэй байна" });
    }
    console.error("POST /pos/cafe-regular-customers error", error);
    return res
      .status(500)
      .json({ message: "Байнгын хэрэглэгч бүртгэж чадсангүй" });
  }
});

router.patch("/pos/cafe-regular-customers/:id", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;
    if (!isCafeCustomerManager(actor)) {
      return res.status(403).json({ message: "Зөвхөн эзэмшигч засна" });
    }

    const existing = await prisma.cafeRegularCustomer.findUnique({
      where: { id: String(req.params.id) },
    });
    if (
      !existing ||
      !canAccessPosOrganization(actor, existing.organizationId)
    ) {
      return res.status(404).json({ message: "Байнгын хэрэглэгч олдсонгүй" });
    }
    if (!(await isCafeOrganization(existing.organizationId))) {
      return res
        .status(403)
        .json({ message: "Кофе шопын горим идэвхгүй байна" });
    }

    const data: {
      name?: string;
      phone?: string;
      normalizedPhone?: string;
      discountPercent?: number;
      isActive?: boolean;
    } = {};
    if (req.body?.name !== undefined) {
      const name = cleanName(req.body.name);
      if (name.length < 2 || name.length > 80) {
        return res
          .status(400)
          .json({ message: "Хэрэглэгчийн нэр 2-80 тэмдэгт байна" });
      }
      data.name = name;
    }
    if (req.body?.phone !== undefined) {
      const phone = normalizeCafeRegularCustomerPhone(req.body.phone);
      if (!phone) {
        return res
          .status(400)
          .json({ message: "Утасны дугаар 8 оронтой байна" });
      }
      data.phone = phone;
      data.normalizedPhone = phone;
    }
    if (req.body?.discountPercent !== undefined) {
      const discountPercent = normalizeCafeRegularCustomerDiscount(
        req.body.discountPercent,
      );
      if (discountPercent === null) {
        return res.status(400).json({ message: "Хямдралын хувь 0-100 байна" });
      }
      data.discountPercent = discountPercent;
    }
    if (req.body?.isActive !== undefined) {
      if (typeof req.body.isActive !== "boolean") {
        return res
          .status(400)
          .json({ message: "isActive утга boolean байх ёстой" });
      }
      data.isActive = req.body.isActive;
    }

    const customer = await prisma.cafeRegularCustomer.update({
      where: { id: existing.id },
      data,
      include: { _count: { select: { sales: true } } },
    });
    return res.json(serializeCustomer(customer));
  } catch (error) {
    if ((error as { code?: string })?.code === "P2002") {
      return res
        .status(409)
        .json({ message: "Энэ утасны дугаар бүртгэлтэй байна" });
    }
    console.error("PATCH /pos/cafe-regular-customers/:id error", error);
    return res
      .status(500)
      .json({ message: "Байнгын хэрэглэгчийг засаж чадсангүй" });
  }
});

export default router;
