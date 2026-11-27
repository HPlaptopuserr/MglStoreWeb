import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { mentorSlotOpen, mentorSlots } from "@mgl/types";
import { prisma } from "@mgl/database";

const slug = "study-mentor-meeting";
const fields = [
  ["mentor", "Ментор"],
  ["name", "Нэр"],
  ["phone", "Утас"],
  ["requestedTime", "Хүссэн цаг (Улаанбаатар)"],
].map(([id, label]) => ({ id, label, type: "text", required: true }));

export const mentorMeetings: Router = Router();
const slotId = (time: string) => slug + "-" + time;
mentorMeetings.get(
  "/forms/study-mentor-meeting/availability",
  async (req, res) => {
    const day = req.query.date;
    if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day))
      return res.sendStatus(400);
    try {
      const times = mentorSlots(day);
      const booked = await prisma.formResponse.findMany({
        where: { form: { slug }, id: { in: times.map(slotId) } },
        select: { id: true },
      });
      res.set("Cache-Control", "no-store");
      return res.json({
        available: times.filter(
          (time) =>
            mentorSlotOpen(time) &&
            !booked.some((item) => item.id === slotId(time)),
        ),
      });
    } catch {
      return res.sendStatus(503);
    }
  },
);
mentorMeetings.post(
  "/forms/study-mentor-meeting/responses",
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
      const form = await prisma.form.upsert({
        where: { slug },
        update: {},
        create: { slug, title: "В. Есөнтөмөр · Уулзалтын хүсэлт", fields },
      });
      if (!form.isActive)
        return res
          .status(410)
          .json({ message: "Уулзалтын хүсэлт түр хаалттай байна." });
      await prisma.formResponse.create({
        data: {
          id: slotId(requestedTime),
          formId: form.id,
          data: {
            mentor: "В. Есөнтөмөр",
            name: name.trim(),
            phone,
            requestedTime,
          },
        },
      });
      return res.status(201).json({ success: true });
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
      return res
        .status(500)
        .json({ message: "Хүсэлт хадгалахад алдаа гарлаа." });
    }
  },
);
