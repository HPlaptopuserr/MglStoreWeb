import { Router, type Router as ExpressRouter } from "express";
import { Capability, prisma } from "@mgl/database";
import { requireAuth, type AuthPayload } from "../../middleware/auth";

const router: ExpressRouter = Router();
const MANAGER_ROLES = new Set(["OWNER", "ADMIN"]);

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadius = 6_371_000;
  const radians = (value: number) => (value * Math.PI) / 180;
  const deltaLat = radians(lat2 - lat1);
  const deltaLng = radians(lng2 - lng1);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(deltaLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function optionalDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function locationFields(body: Record<string, unknown>) {
  return {
    ...(typeof body.name === "string" && { name: body.name.trim() }),
    ...(typeof body.address === "string" && { address: body.address.trim() }),
    ...(typeof body.latitude === "number" && { latitude: body.latitude }),
    ...(typeof body.longitude === "number" && { longitude: body.longitude }),
    ...(typeof body.radiusMeters === "number" && {
      radiusMeters: Math.min(1_000, Math.max(50, Math.round(body.radiusMeters))),
    }),
    ...(body.contactName !== undefined && {
      contactName: typeof body.contactName === "string" ? body.contactName.trim() || null : null,
    }),
    ...(body.contactPhone !== undefined && {
      contactPhone: typeof body.contactPhone === "string" ? body.contactPhone.trim() || null : null,
    }),
  };
}

async function validRepresentativeIds(organizationId: string, value: unknown) {
  const ids = Array.isArray(value)
    ? value.filter((id): id is string => typeof id === "string")
    : [];
  if (ids.length === 0) return [];
  const members = await prisma.organizationMember.findMany({
    where: {
      id: { in: ids }, organizationId, isActive: true,
      capabilities: { has: Capability.SALES_REPRESENTATIVE },
    },
    select: { id: true },
  });
  return members.map(({ id }) => id);
}

async function membership(user: AuthPayload) {
  if (!user.organizationId) return null;
  return prisma.organizationMember.findFirst({
    where: { userId: user.userId, organizationId: user.organizationId, isActive: true, deletedAt: null },
    select: { id: true, organizationId: true, role: true, capabilities: true },
  });
}

function coordinates(body: unknown): { latitude: number; longitude: number } | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  return typeof value.latitude === "number" && typeof value.longitude === "number"
    ? { latitude: value.latitude, longitude: value.longitude }
    : null;
}

router.get("/sales-representative/locations", requireAuth, async (req, res) => {
  const current = await membership((req as any).user as AuthPayload);
  if (!current) return res.status(403).json({ message: "Байгууллагын эрх олдсонгүй" });
  const manager = MANAGER_ROLES.has(current.role);
  if (!manager && !current.capabilities.includes(Capability.SALES_REPRESENTATIVE)) {
    return res.status(403).json({ message: "Худалдааны төлөөлөгчийн эрх шаардлагатай" });
  }
  const locations = await prisma.salesVisitLocation.findMany({
    where: {
      organizationId: current.organizationId,
      isActive: true,
      ...(!manager && { assignments: { some: { memberId: current.id } } }),
    },
    include: {
      assignments: { select: { memberId: true } },
      visits: {
        where: manager ? undefined : { userId: (req as any).user.userId },
        orderBy: { checkedInAt: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });
  return res.json(locations.map(({ assignments, visits, ...location }) => ({
    ...location,
    assignedMemberIds: assignments.map((item) => item.memberId),
    latestVisit: visits[0] ?? null,
  })));
});

router.post("/sales-representative/locations", requireAuth, async (req, res) => {
  const current = await membership((req as any).user as AuthPayload);
  if (!current || !MANAGER_ROLES.has(current.role)) {
    return res.status(403).json({ message: "Дэлгүүр бүртгэх эрх хүрэлцэхгүй" });
  }
  const body = req.body as Record<string, unknown>;
  const point = coordinates(body);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const address = typeof body.address === "string" ? body.address.trim() : "";
  if (!name || !address || !point) {
    return res.status(400).json({ message: "Нэр, хаяг, байршлын цэг шаардлагатай" });
  }
  const assignedMemberIds = await validRepresentativeIds(current.organizationId, body.assignedMemberIds);
  const location = await prisma.salesVisitLocation.create({
    data: {
      organizationId: current.organizationId,
      name,
      address,
      ...point,
      radiusMeters: typeof body.radiusMeters === "number"
        ? Math.min(1_000, Math.max(50, Math.round(body.radiusMeters))) : 150,
      contactName: typeof body.contactName === "string" ? body.contactName.trim() || null : null,
      contactPhone: typeof body.contactPhone === "string" ? body.contactPhone.trim() || null : null,
      assignments: { create: assignedMemberIds.map((memberId) => ({ memberId })) },
    },
  });
  return res.status(201).json(location);
});

router.patch("/sales-representative/locations/:locationId", requireAuth, async (req, res) => {
  const current = await membership((req as any).user as AuthPayload);
  if (!current || !MANAGER_ROLES.has(current.role)) {
    return res.status(403).json({ message: "Дэлгүүр засах эрх хүрэлцэхгүй" });
  }
  const existing = await prisma.salesVisitLocation.findFirst({
    where: { id: req.params.locationId, organizationId: current.organizationId },
  });
  if (!existing) return res.status(404).json({ message: "Дэлгүүр олдсонгүй" });
  const body = req.body as Record<string, unknown>;
  const assignedMemberIds = body.assignedMemberIds === undefined
    ? null
    : await validRepresentativeIds(current.organizationId, body.assignedMemberIds);
  const updated = await prisma.$transaction(async (tx) => {
    if (assignedMemberIds !== null) {
      await tx.salesVisitLocationAssignment.deleteMany({ where: { locationId: existing.id } });
      if (assignedMemberIds.length > 0) {
        await tx.salesVisitLocationAssignment.createMany({
          data: assignedMemberIds.map((memberId) => ({ locationId: existing.id, memberId })),
          skipDuplicates: true,
        });
      }
    }
    return tx.salesVisitLocation.update({
      where: { id: existing.id },
      data: locationFields(body),
      include: { assignments: { select: { memberId: true } } },
    });
  });
  return res.json({
    ...updated,
    assignedMemberIds: updated.assignments.map(({ memberId }) => memberId),
  });
});

router.delete("/sales-representative/locations/:locationId", requireAuth, async (req, res) => {
  const current = await membership((req as any).user as AuthPayload);
  if (!current || !MANAGER_ROLES.has(current.role)) {
    return res.status(403).json({ message: "Дэлгүүр идэвхгүй болгох эрх хүрэлцэхгүй" });
  }
  const result = await prisma.salesVisitLocation.updateMany({
    where: { id: req.params.locationId, organizationId: current.organizationId },
    data: { isActive: false },
  });
  if (result.count === 0) return res.status(404).json({ message: "Дэлгүүр олдсонгүй" });
  return res.status(204).send();
});

router.get("/sales-representative/visits", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthPayload;
  const current = await membership(user);
  if (!current) return res.status(403).json({ message: "Байгууллагын эрх олдсонгүй" });
  const manager = MANAGER_ROLES.has(current.role);
  if (!manager && !current.capabilities.includes(Capability.SALES_REPRESENTATIVE)) {
    return res.status(403).json({ message: "Худалдааны төлөөлөгчийн эрх шаардлагатай" });
  }
  const from = optionalDate(req.query.from);
  const to = optionalDate(req.query.to);
  const representativeId = typeof req.query.representativeId === "string"
    ? req.query.representativeId : null;
  const visits = await prisma.salesVisit.findMany({
    where: {
      organizationId: current.organizationId,
      ...(!manager && { userId: user.userId }),
      ...(manager && representativeId && { userId: representativeId }),
      ...((from || to) && { checkedInAt: { ...(from && { gte: from }), ...(to && { lte: to }) } }),
    },
    include: {
      location: { select: { id: true, name: true, address: true } },
      user: { select: { id: true, profile: { select: { fullName: true, avatarUrl: true } } } },
    },
    orderBy: { checkedInAt: "desc" },
    take: 500,
  });
  return res.json(visits.map((visit) => ({
    ...visit,
    representativeName: visit.user.profile?.fullName || "Худалдааны төлөөлөгч",
    representativeAvatarUrl: visit.user.profile?.avatarUrl ?? null,
  })));
});

router.get("/sales-representative/summary", requireAuth, async (req, res) => {
  const current = await membership((req as any).user as AuthPayload);
  if (!current || !MANAGER_ROLES.has(current.role)) {
    return res.status(403).json({ message: "Тайлан харах эрх хүрэлцэхгүй" });
  }
  const from = optionalDate(req.query.from) ?? new Date(new Date().setHours(0, 0, 0, 0));
  const visits = await prisma.salesVisit.findMany({
    where: { organizationId: current.organizationId, checkedInAt: { gte: from } },
    select: { checkedOutAt: true, durationMinutes: true, promotedProductIds: true, userId: true, locationId: true },
  });
  const completed = visits.filter((visit) => visit.checkedOutAt !== null);
  return res.json({
    totalVisits: visits.length,
    completedVisits: completed.length,
    activeVisits: visits.length - completed.length,
    uniqueStores: new Set(visits.map((visit) => visit.locationId)).size,
    activeRepresentatives: new Set(visits.map((visit) => visit.userId)).size,
    promotedProducts: new Set(completed.flatMap((visit) => visit.promotedProductIds)).size,
    averageDurationMinutes: completed.length === 0 ? 0 : Math.round(
      completed.reduce((sum, visit) => sum + (visit.durationMinutes ?? 0), 0) / completed.length,
    ),
  });
});

router.post("/sales-representative/locations/:locationId/check-in", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthPayload;
  const current = await membership(user);
  const point = coordinates(req.body);
  if (!current || !current.capabilities.includes(Capability.SALES_REPRESENTATIVE)) {
    return res.status(403).json({ message: "Худалдааны төлөөлөгчийн эрх шаардлагатай" });
  }
  if (!point) return res.status(400).json({ message: "GPS байршил шаардлагатай" });
  const location = await prisma.salesVisitLocation.findFirst({
    where: {
      id: req.params.locationId, organizationId: current.organizationId, isActive: true,
      assignments: { some: { memberId: current.id } },
    },
  });
  if (!location) return res.status(404).json({ message: "Оноосон дэлгүүр олдсонгүй" });
  const distance = distanceMeters(point.latitude, point.longitude, location.latitude, location.longitude);
  if (distance > location.radiusMeters) {
    return res.status(409).json({
      message: `Дэлгүүрийн бүсээс гадуур байна (${Math.round(distance)}м)`,
      distanceMeters: Math.round(distance), requiredRadiusMeters: location.radiusMeters,
    });
  }
  const openVisit = await prisma.salesVisit.findFirst({ where: { userId: user.userId, checkedOutAt: null } });
  if (openVisit) return res.status(409).json({ message: "Өмнөх айлчлалаа эхлээд дуусгана уу" });
  const visit = await prisma.salesVisit.create({
    data: {
      organizationId: current.organizationId, locationId: location.id, userId: user.userId,
      checkedInLatitude: point.latitude, checkedInLongitude: point.longitude,
    },
  });
  return res.status(201).json(visit);
});

router.post("/sales-representative/visits/:visitId/check-out", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthPayload;
  const current = await membership(user);
  const point = coordinates(req.body);
  if (!current || !point) return res.status(400).json({ message: "GPS байршил шаардлагатай" });
  const visit = await prisma.salesVisit.findFirst({
    where: { id: req.params.visitId, userId: user.userId, organizationId: current.organizationId, checkedOutAt: null },
    include: { location: true },
  });
  if (!visit) return res.status(404).json({ message: "Идэвхтэй айлчлал олдсонгүй" });
  const distance = distanceMeters(point.latitude, point.longitude, visit.location.latitude, visit.location.longitude);
  if (distance > visit.location.radiusMeters) {
    return res.status(409).json({ message: `Дэлгүүрийн бүсээс гадуур байна (${Math.round(distance)}м)` });
  }
  const body = req.body as Record<string, unknown>;
  const promotedProductIds = Array.isArray(body.promotedProductIds)
    ? body.promotedProductIds.filter((id): id is string => typeof id === "string") : [];
  if (promotedProductIds.length > 0) {
    const validProductCount = await prisma.product.count({
      where: { id: { in: promotedProductIds }, organizationId: current.organizationId, deletedAt: null },
    });
    if (validProductCount !== new Set(promotedProductIds).size) {
      return res.status(400).json({ message: "Сурталчилсан бүтээгдэхүүний мэдээлэл буруу байна" });
    }
  }
  const checkedOutAt = new Date();
  const updated = await prisma.salesVisit.update({
    where: { id: visit.id },
    data: {
      checkedOutAt, checkedOutLatitude: point.latitude, checkedOutLongitude: point.longitude,
      durationMinutes: Math.max(0, Math.round((checkedOutAt.getTime() - visit.checkedInAt.getTime()) / 60_000)),
      note: typeof body.note === "string" ? body.note.trim() || null : null,
      promotedProductIds,
    },
  });
  return res.json(updated);
});

export default router;
