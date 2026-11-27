import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { prisma } from "@mgl/database";

const slug = "study-mentor-meeting";
const fields = [
  ["mentor", "Ментор"],
  ["name", "Нэр"],
  ["phone", "Утас"],
  ["requestedTime", "Хүссэн цаг (Улаанбаатар)"],
].map(([id, label]) => ({ id, label, type: "text", required: true }));

export const mentorMeetings: Router = Router();
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
    const local = new Date(requestedTime + ":00Z");
    const instant = Date.parse(requestedTime + ":00+08:00");
    if (
      !Number.isFinite(instant) ||
      !Number.isFinite(local.getTime()) ||
      local.toISOString().slice(0, 16) !== requestedTime ||
      instant <= Date.now()
    )
      return res
        .status(400)
        .json({ message: "Ирээдүйн өдөр, цаг сонгоно уу." });
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
    } catch {
      return res
        .status(500)
        .json({ message: "Хүсэлт хадгалахад алдаа гарлаа." });
    }
  },
);
