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
import {
  resolvePosDiscountProfileType,
  type PosDiscountProfileType,
} from "./discount-profile";

const router: ExpressRouter = Router();

const cleanName = (value: unknown) => String(value ?? "").trim();

const isDiscountProfileManager = (actor: AuthUser) =>
  actor.role === "ADMIN" ||
  actor.role === "SUPER_ADMIN" ||
  actor.orgRole === "OWNER" ||
  actor.orgRole === "ADMIN";

const resolveOrganizationId = (actor: AuthUser, value: unknown) => {
  const requested = String(value ?? "").trim();
  const organizationId = requested || actor.organizationId || "";
  return organizationId && canAccessPosOrganization(actor, organizationId)
    ? organizationId
    : null;
};

async function resolveDiscountProfileType(
  organizationId: string,
): Promise<PosDiscountProfileType | null> {
  const settings = await prisma.siteSetting.findMany({
    where: {
      key: {
        in: [
          `self-service-enabled-${organizationId}`,
          `self-service-mode-${organizationId}`,
        ],
      },
    },
    select: { key: true, value: true },
  });
  const values = new Map(settings.map((setting) => [setting.key, setting.value]));
  return resolvePosDiscountProfileType(
    values.get(`self-service-enabled-${organizationId}`),
    values.get(`self-service-mode-${organizationId}`),
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
    const profileType = await resolveDiscountProfileType(organizationId);
    if (!profileType) {
      return res
        .status(403)
        .json({ message: "Өөртөө үйлчлэх кассын горим идэвхгүй байна" });
    }

    const phone = normalizeCafeRegularCustomerPhone(req.body?.phone);
    if (!phone) {
      return res.status(400).json({ message: "Утасны дугаар 8 оронтой байна" });
    }

    const customer = await prisma.cafeRegularCustomer.findUnique({
      where: {
        organizationId_normalizedPhone_profileType: {
          organizationId,
          normalizedPhone: phone,
          profileType,
        },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        normalizedPhone: true,
        profileType: true,
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
      .json({ message: "Хөнгөлөлтийн бүртгэлийг шалгаж чадсангүй" });
  }
});

router.get("/pos/cafe-regular-customers", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;
    if (!isDiscountProfileManager(actor)) {
      return res
        .status(403)
        .json({ message: "Зөвхөн эзэмшигч эсвэл админ удирдана" });
    }

    const organizationId = resolveOrganizationId(
      actor,
      req.query.organizationId,
    );
    if (!organizationId) {
      return res.status(403).json({ message: "Байгууллагын эрх хүрэлцэхгүй" });
    }
    const profileType = await resolveDiscountProfileType(organizationId);
    if (!profileType) {
      return res
        .status(403)
        .json({ message: "Өөртөө үйлчлэх кассын горим идэвхгүй байна" });
    }

    const search = String(req.query.search ?? "")
      .trim()
      .slice(0, 80);
    const searchDigits = search.replace(/\D/g, "");
    const customers = await prisma.cafeRegularCustomer.findMany({
      where: {
        organizationId,
        profileType,
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
      .json({ message: "Хөнгөлөлтийн бүртгэлүүдийг авахад алдаа гарлаа" });
  }
});

router.post("/pos/cafe-regular-customers", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;
    if (!isDiscountProfileManager(actor)) {
      return res
        .status(403)
        .json({ message: "Зөвхөн эзэмшигч эсвэл админ бүртгэнэ" });
    }

    const organizationId = resolveOrganizationId(
      actor,
      req.body?.organizationId,
    );
    if (!organizationId) {
      return res.status(403).json({ message: "Байгууллагын эрх хүрэлцэхгүй" });
    }
    const profileType = await resolveDiscountProfileType(organizationId);
    if (!profileType) {
      return res
        .status(403)
        .json({ message: "Өөртөө үйлчлэх кассын горим идэвхгүй байна" });
    }

    const name = cleanName(req.body?.name);
    const phone = normalizeCafeRegularCustomerPhone(req.body?.phone);
    const discountPercent = normalizeCafeRegularCustomerDiscount(
      req.body?.discountPercent,
    );
    if (name.length < 2 || name.length > 80) {
      return res
        .status(400)
        .json({ message: "Нэр 2-80 тэмдэгт байна" });
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
        profileType,
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
      .json({ message: "Хөнгөлөлтийн бүртгэл хадгалж чадсангүй" });
  }
});

router.patch("/pos/cafe-regular-customers/:id", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;
    if (!isDiscountProfileManager(actor)) {
      return res
        .status(403)
        .json({ message: "Зөвхөн эзэмшигч эсвэл админ засна" });
    }

    const existing = await prisma.cafeRegularCustomer.findUnique({
      where: { id: String(req.params.id) },
    });
    if (
      !existing ||
      !canAccessPosOrganization(actor, existing.organizationId)
    ) {
      return res.status(404).json({ message: "Хөнгөлөлтийн бүртгэл олдсонгүй" });
    }
    const profileType = await resolveDiscountProfileType(
      existing.organizationId,
    );
    if (!profileType || existing.profileType !== profileType) {
      return res
        .status(403)
        .json({ message: "Энэ хөнгөлөлтийн бүртгэлийг засах эрхгүй байна" });
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
          .json({ message: "Нэр 2-80 тэмдэгт байна" });
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
      .json({ message: "Хөнгөлөлтийн бүртгэлийг засаж чадсангүй" });
  }
});

export default router;
