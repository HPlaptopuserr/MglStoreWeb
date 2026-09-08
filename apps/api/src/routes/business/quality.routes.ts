import { Router, type Router as ExpressRouter } from "express";
import { Capability, Prisma, prisma } from "@mgl/database";
import { requireAuth, type AuthPayload } from "../../middleware/auth";

// Quality routes rely on the generated Prisma client; restart the API after a
// schema migration so newly generated model delegates are loaded.
const router: ExpressRouter = Router();
const MANAGER_ROLES = new Set(["OWNER", "ADMIN", "CEO", "MANAGER"]);

type ChecklistQuestion = {
  id: string;
  text: string;
  weight: number;
  required: boolean;
};

type ChecklistSection = {
  id: string;
  title: string;
  questions: ChecklistQuestion[];
};

async function membership(user: AuthPayload) {
  if (!user.organizationId) return null;
  return prisma.organizationMember.findFirst({
    where: {
      userId: user.userId,
      organizationId: user.organizationId,
      isActive: true,
      deletedAt: null,
    },
    select: { id: true, organizationId: true, role: true, capabilities: true },
  });
}

function hasCapability(
  current: NonNullable<Awaited<ReturnType<typeof membership>>>,
  capability: Capability,
) {
  return (
    MANAGER_ROLES.has(current.role) ||
    current.capabilities.includes(capability) ||
    (capability === Capability.QUALITY_INSPECTION_PERFORM &&
      current.capabilities.includes(Capability.SALES_REPRESENTATIVE))
  );
}

function startOfUlaanbaatarDay(now: Date): Date {
  const offsetMs = 8 * 60 * 60 * 1_000;
  const localNow = new Date(now.getTime() + offsetMs);
  return new Date(
    Date.UTC(
      localNow.getUTCFullYear(),
      localNow.getUTCMonth(),
      localNow.getUTCDate(),
    ) - offsetMs,
  );
}

function parseSchema(value: unknown): ChecklistSection[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 30)
    return null;
  const ids = new Set<string>();
  const sections: ChecklistSection[] = [];
  for (const rawSection of value) {
    if (!rawSection || typeof rawSection !== "object") return null;
    const section = rawSection as Record<string, unknown>;
    const id = typeof section.id === "string" ? section.id.trim() : "";
    const title = typeof section.title === "string" ? section.title.trim() : "";
    if (!id || !title || ids.has(id) || !Array.isArray(section.questions))
      return null;
    ids.add(id);
    const questions: ChecklistQuestion[] = [];
    for (const rawQuestion of section.questions) {
      if (!rawQuestion || typeof rawQuestion !== "object") return null;
      const question = rawQuestion as Record<string, unknown>;
      const questionId =
        typeof question.id === "string" ? question.id.trim() : "";
      const text =
        typeof question.text === "string" ? question.text.trim() : "";
      const weight =
        typeof question.weight === "number" ? Math.round(question.weight) : 1;
      if (
        !questionId ||
        !text ||
        ids.has(questionId) ||
        weight < 1 ||
        weight > 100
      )
        return null;
      ids.add(questionId);
      questions.push({
        id: questionId,
        text,
        weight,
        required: question.required !== false,
      });
    }
    if (questions.length === 0 || questions.length > 100) return null;
    sections.push({ id, title, questions });
  }
  return sections;
}

async function resolveLocationId(
  requestedId: string,
  organizationId: string,
): Promise<string> {
  if (!requestedId.startsWith("branch:")) return requestedId;
  const branch = await prisma.branch.findFirst({
    where: { id: requestedId.slice(7), deletedAt: null },
    select: { organizationId: true },
  });
  if (!branch) return requestedId;
  const location = await prisma.salesVisitLocation.findFirst({
    where: {
      organizationId,
      vendorOrganizationId: branch.organizationId,
      isActive: true,
    },
    select: { id: true },
  });
  return location?.id ?? requestedId;
}

router.get("/quality/checklists/active", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthPayload;
  const current = await membership(user);
  if (
    !current ||
    !hasCapability(current, Capability.QUALITY_INSPECTION_PERFORM)
  ) {
    return res
      .status(403)
      .json({ message: "Чанарын шалгалт хийх эрх хүрэлцэхгүй" });
  }
  const requestedLocationId =
    typeof req.query.storeId === "string" ? req.query.storeId : "";
  const locationId = await resolveLocationId(
    requestedLocationId,
    current.organizationId,
  );
  const location = await prisma.salesVisitLocation.findFirst({
    where: {
      id: locationId,
      organizationId: current.organizationId,
      isActive: true,
    },
    select: {
      id: true,
      vendorOrganization: { select: { businessCategory: true } },
    },
  });
  if (!location)
    return res.status(404).json({ message: "Шалгах дэлгүүр олдсонгүй" });
  if (location.vendorOrganization?.businessCategory !== "market-food-grocery") {
    return res
      .status(403)
      .json({
        message:
          "Энэ байгууллагад чанарын шалгалт хийхгүй. Захиалга авах боломжтой",
        code: "QUALITY_NOT_APPLICABLE",
      });
  }
  const dayStart = startOfUlaanbaatarDay(new Date());
  const arrival = await prisma.salesVisit.findFirst({
    where: {
      organizationId: current.organizationId,
      locationId,
      userId: user.userId,
      checkedInAt: { gte: dayStart },
    },
    select: { id: true },
  });
  if (!arrival) {
    return res.status(409).json({
      message:
        "Энэ дэлгүүр дээр очиж, ирснээ биометр болон GPS-ээр баталгаажуулна уу. Энэ шаардлага Manager/Owner-д мөн үйлчилнэ",
      code: "STORE_ARRIVAL_REQUIRED",
    });
  }
  const template = await prisma.qualityChecklistTemplate.findFirst({
    where: { organizationId: current.organizationId, isActive: true },
    orderBy: { version: "desc" },
  });
  if (!template) {
    return res.status(404).json({
      message:
        "Идэвхтэй чанарын стандарт тохируулаагүй байна. Эзэмшигч стандартын загварыг эхлээд оруулна уу",
      code: "QUALITY_TEMPLATE_NOT_CONFIGURED",
    });
  }
  return res.json(template);
});

router.get("/quality/checklists/manage", requireAuth, async (req, res) => {
  const user = (req as unknown as { user: AuthPayload }).user;
  try {
    const current = await membership(user);
    if (
      !current ||
      !hasCapability(current, Capability.QUALITY_TEMPLATE_MANAGE)
    ) {
      return res
        .status(403)
        .json({ message: "Checklist удирдах эрх хүрэлцэхгүй" });
    }
    const template = await prisma.qualityChecklistTemplate.findFirst({
      where: { organizationId: current.organizationId, isActive: true },
      orderBy: { version: "desc" },
    });
    return res.json(template);
  } catch (error) {
    console.error("Read quality template failed", error);
    return res
      .status(500)
      .json({ message: "Checklist ачаалж чадсангүй. Дахин оролдоно уу" });
  }
});

router.put("/quality/checklists/active", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthPayload;
  const current = await membership(user);
  if (!current || !hasCapability(current, Capability.QUALITY_TEMPLATE_MANAGE)) {
    return res
      .status(403)
      .json({ message: "Чанарын стандарт өөрчлөх эрх хүрэлцэхгүй" });
  }
  const body = req.body as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const schema = parseSchema(body.sections);
  if (!name || !schema) {
    return res
      .status(400)
      .json({
        message: "Стандартын нэр, бүлэг болон асуултууд бүрэн биш байна",
      });
  }
  const latest = await prisma.qualityChecklistTemplate.findFirst({
    where: { organizationId: current.organizationId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const template = await prisma.$transaction(async (tx) => {
    await tx.qualityChecklistTemplate.updateMany({
      where: { organizationId: current.organizationId, isActive: true },
      data: { isActive: false },
    });
    return tx.qualityChecklistTemplate.create({
      data: {
        organizationId: current.organizationId,
        name,
        version: (latest?.version ?? 0) + 1,
        schema: schema as unknown as Prisma.InputJsonValue,
        createdById: user.userId,
      },
    });
  });
  return res.status(201).json(template);
});

router.get("/quality/inspections/today", requireAuth, async (req, res) => {
  const user = (req as unknown as { user: AuthPayload }).user;
  try {
    const current = await membership(user);
    if (
      !current ||
      !hasCapability(current, Capability.QUALITY_INSPECTION_PERFORM)
    ) {
      return res.status(403).json({ message: "Шалгалт харах эрх хүрэлцэхгүй" });
    }
    const requested =
      typeof req.query.storeId === "string" ? req.query.storeId : "";
    const locationId = await resolveLocationId(
      requested,
      current.organizationId,
    );
    const start = startOfUlaanbaatarDay(new Date());
    return res.json(
      await prisma.qualityInspection.findFirst({
        where: {
          organizationId: current.organizationId,
          locationId,
          inspectorId: user.userId,
          submittedAt: { gte: start, lt: new Date(start.getTime() + 86400000) },
        },
        orderBy: { submittedAt: "desc" },
      }),
    );
  } catch (error) {
    console.error("Read daily inspection failed", error);
    return res
      .status(500)
      .json({ message: "Өнөөдрийн шалгалтыг ачаалж чадсангүй" });
  }
});

router.post("/quality/inspections", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthPayload;
  const current = await membership(user);
  if (
    !current ||
    !hasCapability(current, Capability.QUALITY_INSPECTION_PERFORM)
  ) {
    return res
      .status(403)
      .json({ message: "Чанарын шалгалт хийх эрх хүрэлцэхгүй" });
  }
  const body = req.body as Record<string, unknown>;
  const requestedLocationId =
    typeof body.locationId === "string" ? body.locationId : "";
  const locationId = await resolveLocationId(
    requestedLocationId,
    current.organizationId,
  );
  const templateId = typeof body.templateId === "string" ? body.templateId : "";
  const template = await prisma.qualityChecklistTemplate.findFirst({
    where: {
      id: templateId,
      organizationId: current.organizationId,
      isActive: true,
    },
  });
  const schema = parseSchema(template?.schema);
  if (!template || !schema)
    return res
      .status(409)
      .json({
        message: "Идэвхтэй стандарт өөрчлөгдсөн байна. Дахин ачаална уу",
      });
  const location = await prisma.salesVisitLocation.findFirst({
    where: {
      id: locationId,
      organizationId: current.organizationId,
      isActive: true,
    },
    include: { vendorOrganization: { select: { businessCategory: true } } },
  });
  if (!location)
    return res.status(404).json({ message: "Шалгах дэлгүүр олдсонгүй" });
  if (location.vendorOrganization?.businessCategory !== "market-food-grocery") {
    return res
      .status(403)
      .json({
        message:
          "Энэ байгууллагад чанарын шалгалт хийхгүй. Захиалга авах боломжтой",
        code: "QUALITY_NOT_APPLICABLE",
      });
  }
  const dayStart = startOfUlaanbaatarDay(new Date());
  const arrival = await prisma.salesVisit.findFirst({
    where: {
      organizationId: current.organizationId,
      locationId,
      userId: user.userId,
      checkedInAt: { gte: dayStart },
    },
  });
  if (!arrival)
    return res.status(409).json({
      message:
        "Үнэлгээ өгөхийн өмнө энэ дэлгүүр дээр ирснээ баталгаажуулна уу. Энэ шаардлага бүх албан тушаалд ижил үйлчилнэ",
      code: "STORE_ARRIVAL_REQUIRED",
    });
  const rawAnswers = Array.isArray(body.answers) ? body.answers : [];
  const answerMap = new Map<
    string,
    { value: boolean | null; note: string | null }
  >();
  for (const raw of rawAnswers) {
    if (!raw || typeof raw !== "object") continue;
    const answer = raw as Record<string, unknown>;
    if (typeof answer.questionId !== "string") continue;
    answerMap.set(answer.questionId, {
      value: typeof answer.value === "boolean" ? answer.value : null,
      note: typeof answer.note === "string" ? answer.note.trim() || null : null,
    });
  }
  const questions = schema.flatMap((section) => section.questions);
  if (
    questions.some(
      (question) =>
        question.required && answerMap.get(question.id)?.value == null,
    )
  ) {
    return res
      .status(400)
      .json({ message: "Заавал хариулах бүх асуултыг бөглөнө үү" });
  }
  const scorePossible = questions.reduce(
    (sum, question) => sum + question.weight,
    0,
  );
  const scoreEarned = questions.reduce(
    (sum, question) =>
      sum + (answerMap.get(question.id)?.value === true ? question.weight : 0),
    0,
  );
  const scorePercent =
    scorePossible === 0
      ? 0
      : Math.round((scoreEarned / scorePossible) * 10_000) / 100;
  const result =
    scorePercent >= 80 ? "PASSED" : scorePercent >= 60 ? "ATTENTION" : "FAILED";
  const answers = questions.map((question) => ({
    questionId: question.id,
    value: answerMap.get(question.id)?.value ?? null,
    note: answerMap.get(question.id)?.note ?? null,
  }));
  const inspection = await prisma.$transaction(async (tx) => {
    const lockKey = `quality:${current.organizationId}:${locationId}:${user.userId}:${dayStart.toISOString()}`;
    await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${lockKey}))) AS daily_lock`;
    const existing = await tx.qualityInspection.findFirst({
      where: {
        organizationId: current.organizationId,
        locationId,
        inspectorId: user.userId,
        submittedAt: {
          gte: dayStart,
          lt: new Date(dayStart.getTime() + 86400000),
        },
      },
      orderBy: { submittedAt: "desc" },
    });
    if (existing) return existing;
    return tx.qualityInspection.create({
      data: {
        organizationId: current.organizationId,
        locationId,
        inspectorId: user.userId,
        templateId: template.id,
        templateVersion: template.version,
        templateSnapshot: schema as unknown as Prisma.InputJsonValue,
        answers: answers as unknown as Prisma.InputJsonValue,
        scoreEarned,
        scorePossible,
        scorePercent,
        result,
      },
    });
  });
  return res.status(201).json(inspection);
});

export default router;
