import { normalizePhoneNumber } from "../../utils/phone-number";
import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import {
  workforceAccess,
  WorkforceError,
} from "../../services/workforce/access";
import { daysBetween, wallNow } from "../../services/workforce/calculation";
import { object, text, strings } from "../../services/workforce/validation";
import { endpoint, audit, assertMembers } from "./http";
export const employeesRouter: ExpressRouter = Router();
employeesRouter.patch(
  "/employees/:id",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, {
        manage: true,
        feature: "employees",
      }),
      id = String(req.params.id),
      b = object(req.body);
    const department = text(b.department, "Хэлтэс", 120, true),
      active = b.active;
    if (typeof active !== "boolean")
      throw new WorkforceError(400, "Идэвхийн төлөв буруу");
    await prisma.$transaction(
      async (tx) => {
        const member = await tx.organizationMember.findFirst({
          where: { id, organizationId: ctx.organizationId, deletedAt: null },
        });
        if (!member) throw new WorkforceError(404, "Ажилтан олдсонгүй");
        if (
          (member.role === "OWNER" || member.userId === ctx.user.userId) &&
          !active
        )
          throw new WorkforceError(
            400,
            "Эзэмшигч болон өөрийгөө идэвхгүй болгохгүй",
          );
        if (
          department &&
          !(await tx.workforceDepartment.findFirst({
            where: { organizationId: ctx.organizationId, name: department },
          }))
        )
          throw new WorkforceError(400, "Хэлтэс олдсонгүй");
        if (active && !member.isActive) {
          const count = await tx.organizationMember.count({
            where: {
              organizationId: ctx.organizationId,
              isActive: true,
              deletedAt: null,
            },
          });
          if (count >= ctx.member.organization.maxMembers)
            throw new WorkforceError(409, "Ажилтны лимит дүүрсэн");
        }
        const updated = await tx.organizationMember.update({
          where: { id },
          data: {
            department: department || null,
            isActive: active,
            ...(active
              ? {
                  employmentEndedAt: null,
                  employmentEndReason: null,
                  employmentEndedBy: null,
                }
              : {}),
          },
        });
        await audit(
          tx,
          ctx.organizationId,
          ctx.user.userId,
          "EMPLOYEE_UPDATED",
          id,
          member,
          updated,
        );
      },
      { isolationLevel: "Serializable" },
    );
    res.json({ ok: true });
  }),
);

employeesRouter.post(
  "/employees",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, {
        manage: true,
        feature: "employees",
      }),
      b = object(req.body),
      identifier = text(
        b.identifier ?? b.phoneNumber ?? b.email,
        "Утасны дугаар эсвэл имэйл",
        254,
      );
    const isEmail = identifier.includes("@");
    const phone = isEmail ? null : normalizePhoneNumber(identifier);
    if (
      !isEmail &&
      (!/^[+\d\s()-]+$/.test(identifier) || !phone || !/^\d{8}$/.test(phone))
    )
      throw new WorkforceError(
        400,
        "8 оронтой утасны дугаар эсвэл имэйл оруулна уу",
      );
    const phoneVariants = phone
      ? [phone, `+976${phone}`, `976${phone}`, `+976 ${phone}`, identifier]
      : [];
    const result = await prisma.$transaction(
      async (tx) => {
        const count = await tx.organizationMember.count({
          where: {
            organizationId: ctx.organizationId,
            isActive: true,
            deletedAt: null,
          },
        });
        if (count >= ctx.member.organization.maxMembers)
          throw new WorkforceError(409, "Ажилтны лимит дүүрсэн");
        const matches = await tx.user.findMany({
          where: {
            ...(isEmail
              ? {
                  email: {
                    equals: identifier.toLowerCase(),
                    mode: "insensitive" as const,
                  },
                }
              : { profile: { phoneNumber: { in: phoneVariants } } }),
            deletedAt: null,
            isActive: true,
          },
          select: { id: true },
          take: 2,
        });
        if (matches.length > 1)
          throw new WorkforceError(
            409,
            "Энэ дугаарт олон бүртгэл таарлаа. Имэйлээр нэмэх эсвэл бүртгэлийг шалгуулна уу",
          );
        const user = matches[0];
        if (!user)
          throw new WorkforceError(
            404,
            "Энэ утасны дугаар эсвэл имэйлээр бүртгэлтэй хэрэглэгч олдсонгүй",
          );
        const prior = await tx.organizationMember.findUnique({
          where: {
            userId_organizationId: {
              userId: user.id,
              organizationId: ctx.organizationId,
            },
          },
        });
        if (prior?.isActive && !prior.deletedAt)
          throw new WorkforceError(409, "Ажилтан аль хэдийн бүртгэлтэй");
        const row = await tx.organizationMember.upsert({
          where: {
            userId_organizationId: {
              userId: user.id,
              organizationId: ctx.organizationId,
            },
          },
          create: {
            userId: user.id,
            organizationId: ctx.organizationId,
            role: "STAFF",
          },
          update: {
            isActive: true,
            deletedAt: null,
            employmentEndedAt: null,
            employmentEndReason: null,
            employmentEndedBy: null,
          },
        });
        await audit(
          tx,
          ctx.organizationId,
          ctx.user.userId,
          "EMPLOYEE_ADDED",
          row.id,
          prior,
          row,
        );
        return { id: row.id };
      },
      { isolationLevel: "Serializable" },
    );
    res.status(201).json(result);
  }),
);

employeesRouter.post(
  "/employees/:id/offboard",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, {
        manage: true,
        feature: "employees",
      }),
      id = String(req.params.id),
      b = object(req.body),
      reason = text(b.reason, "Ажлаас гарсан шалтгаан", 2000),
      lastDay = text(b.lastDay, "Сүүлийн ажилласан өдөр", 10);
    daysBetween(lastDay, lastDay);
    const today = wallNow(
      ctx.member.organization.workforcePolicy?.timeZone ?? "Asia/Ulaanbaatar",
    )
      .toISOString()
      .slice(0, 10);
    if (lastDay > today)
      throw new WorkforceError(
        400,
        "Сүүлийн ажилласан өдөр ирээдүйд байж болохгүй",
      );
    await prisma.$transaction(
      async (tx) => {
        const employee = await tx.organizationMember.findFirst({
          where: { id, organizationId: ctx.organizationId, deletedAt: null },
        });
        if (!employee) throw new WorkforceError(404, "Ажилтан олдсонгүй");
        if (employee.role === "OWNER" || employee.userId === ctx.user.userId)
          throw new WorkforceError(
            403,
            "Эзэмшигч болон өөрийгөө ажлаас гаргах боломжгүй",
          );
        if (employee.role === "ADMIN" && ctx.member.role !== "OWNER")
          throw new WorkforceError(
            403,
            "Админыг зөвхөн байгууллагын эзэмшигч ажлаас гаргана",
          );
        if (!employee.isActive)
          throw new WorkforceError(409, "Ажилтан аль хэдийн идэвхгүй байна");
        if (lastDay < employee.createdAt.toISOString().slice(0, 10))
          throw new WorkforceError(
            400,
            "Сүүлийн өдөр байгууллагад элссэн өдрөөс өмнө байна",
          );
        const end = new Date(`${lastDay}T00:00:00Z`);
        const updated = await tx.organizationMember.update({
          where: { id },
          data: {
            isActive: false,
            employmentEndedAt: end,
            employmentEndReason: reason,
            employmentEndedBy: ctx.user.userId,
          },
        });
        await tx.workforceRequest.updateMany({
          where: {
            organizationId: ctx.organizationId,
            userId: employee.userId,
            state: "PENDING",
            from: { gt: new Date(+end + 86400000) },
          },
          data: {
            state: "CANCELLED",
            decisionNote: "Ажилтны гишүүнчлэл дууссан",
            decidedBy: ctx.user.userId,
            decidedAt: new Date(),
          },
        });
        await tx.workforceTrackingPreference.updateMany({
          where: {
            organizationId: ctx.organizationId,
            userId: employee.userId,
          },
          data: { enabled: false },
        });
        await tx.workforceDepartment.updateMany({
          where: {
            organizationId: ctx.organizationId,
            managerId: employee.userId,
          },
          data: { managerId: null },
        });
        await audit(
          tx,
          ctx.organizationId,
          ctx.user.userId,
          "EMPLOYEE_OFFBOARDED",
          id,
          employee,
          updated,
        );
      },
      { isolationLevel: "Serializable" },
    );
    res.json({ ok: true });
  }),
);

employeesRouter.post(
  "/employees/assign-department",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, {
        manage: true,
        feature: "departments",
      }),
      b = object(req.body),
      userIds = strings(b.userIds, "Ажилтнууд", 500),
      departmentId = text(b.departmentId, "Хэлтэс", 100);
    if (!userIds.length) throw new WorkforceError(400, "Ажилтан сонгоно уу");
    await prisma.$transaction(async (tx) => {
      await assertMembers(ctx.organizationId, userIds, tx);
      const department = await tx.workforceDepartment.findFirst({
        where: { id: departmentId, organizationId: ctx.organizationId },
      });
      if (!department) throw new WorkforceError(404, "Хэлтэс олдсонгүй");
      const before = await tx.organizationMember.findMany({
        where: { organizationId: ctx.organizationId, userId: { in: userIds } },
        select: { id: true, userId: true, department: true },
      });
      await tx.organizationMember.updateMany({
        where: {
          organizationId: ctx.organizationId,
          userId: { in: userIds },
          isActive: true,
          deletedAt: null,
        },
        data: { department: department.name },
      });
      await audit(
        tx,
        ctx.organizationId,
        ctx.user.userId,
        "EMPLOYEES_DEPARTMENT_ASSIGNED",
        department.id,
        before,
        { userIds, department: department.name },
      );
    });
    res.json({ ok: true });
  }),
);
