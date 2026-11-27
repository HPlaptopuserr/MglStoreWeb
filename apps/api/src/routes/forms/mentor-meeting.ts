import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { mentorSlotOpen, mentorSlots } from "@mgl/types";
import { prisma } from "@mgl/database";

import {
  mentorForm as slug,
  slotId,
  checkMentorPayment,
  createMentorPayment,
  resolveMeetingTeacher,
  defaultMeetingTeacher,
} from "../../services/mentor-bookings";
const fields = [
  ["mentor", "Ментор"],
  ["paymentStatus", "Төлбөрийн төлөв"],
  ["amount", "Төлбөр (₮)"],
  ["name", "Нэр"],
  ["phone", "Утас"],
  ["requestedTime", "Хүссэн цаг (Улаанбаатар)"],
].map(([id, label]) => ({ id, label, type: "text", required: true }));

export const mentorMeetings: Router = Router();
const checkLimit = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
mentorMeetings.all(
  [
    "/forms/study-mentor-meeting/payment/check",
    "/forms/study-mentor-meeting/payment/callback",
  ],
  checkLimit,
  async (req, res) => {
    const { invoiceId, projectId } = req.query;
    if (
      typeof invoiceId !== "string" ||
      typeof projectId !== "string" ||
      invoiceId.length !== 36 ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?:\.[a-f0-9]{64})?$/.test(projectId)
    )
      return res.sendStatus(400);
    res.set("Cache-Control", "no-store");
    try {
      const isPaid = await checkMentorPayment(projectId, invoiceId);
      if (isPaid === null)
        return res
          .status(404)
          .json({ message: "Нэхэмжлэлийн хугацаа дууссан байна." });
      return res.json({ success: true, isPaid });
    } catch {
      return res.sendStatus(503);
    }
  },
);
mentorMeetings.get(
  "/forms/study-mentor-meeting/availability",
  async (req, res) => {
    const day = req.query.date;
    if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day))
      return res.sendStatus(400);
    try {
      const teacher =
        req.query.courseId === undefined
          ? defaultMeetingTeacher
          : await resolveMeetingTeacher(
              req.query.courseId,
              req.query.index,
              req.query.name,
            );
      if (!teacher) return res.sendStatus(400);
      const times = mentorSlots(day);
      const idForTime = (time: string) => slotId(time + teacher.suffix);
      const booked = await prisma.formResponse.findMany({
        where: { form: { slug }, id: { in: times.map(idForTime) } },
        select: { id: true },
      });
      res.set("Cache-Control", "no-store");
      return res.json({
        available: times.filter(
          (time) =>
            mentorSlotOpen(time) &&
            !booked.some((item) => item.id === idForTime(time)),
        ),
      });
    } catch {
      return res.sendStatus(503);
    }
  },
);
mentorMeetings.post(
  [
    "/forms/study-mentor-meeting/responses",
    "/forms/study-mentor-meeting/teacher-responses",
  ],
  rateLimit({
    windowMs: 60_000,
    limit: 6,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
  async (req, res) => {
    const data: unknown = req.body?.data;
    if (!data || typeof data !== "object") return res.sendStatus(400);
    const { name, phone, requestedTime } = data as Record<string, unknown>;
    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 100 ||
      typeof phone !== "string" ||
      !/^\d{8}$/.test(phone) ||
      typeof requestedTime !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(requestedTime)
    )
      return res
        .status(400)
        .json({ message: "Нэр, 8 оронтой утас, хүссэн өдрөө шалгана уу." });
    if (!mentorSlotOpen(requestedTime))
      return res
        .status(400)
        .json({ message: "Энэ цаг хаалттай. Өөр цаг сонгоно уу." });
    try {
      let teacher = defaultMeetingTeacher;
      if (req.path.endsWith("/teacher-responses")) {
        const selected: unknown = req.body.data.teacher;
        if (
          !selected ||
          typeof selected !== "object" ||
          !("courseId" in selected) ||
          !("index" in selected) ||
          !("name" in selected)
        )
          return res.sendStatus(400);
        const resolved = await resolveMeetingTeacher(
          selected.courseId,
          selected.index,
          selected.name,
        );
        if (!resolved)
          return res
            .status(400)
            .json({
              message:
                "Багшийн бүртгэл өөрчлөгдсөн байна. Жагсаалтыг шинэчилнэ үү.",
            });
        teacher = resolved;
      }
      const form = await prisma.form.upsert({
        where: { slug },
        update: { fields, title: "Багштай уулзах захиалга" },
        create: { slug, title: "Багштай уулзах захиалга", fields },
      });
      if (!form.isActive)
        return res
          .status(410)
          .json({ message: "Уулзалтын хүсэлт түр хаалттай байна." });
      const payment = await createMentorPayment(
        form.id,
        {
          name: name.trim(),
          phone,
          requestedTime,
        },
        teacher,
      );
      return res.status(201).json({ payment });
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      )
        return res
          .status(409)
          .json({ message: "Энэ цаг захиалагдсан байна. Өөр цаг сонгоно уу." });
      return res.status(500).json({
        message: "Төлбөрийн нэхэмжлэл үүсгэж чадсангүй. Дахин оролдоно уу.",
      });
    }
  },
);
