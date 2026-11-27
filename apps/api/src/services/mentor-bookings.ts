import { randomUUID } from "node:crypto";
import { prisma, type Prisma } from "@mgl/database";
import { sendSmtpMail, isSmtpConfigured } from "../lib/smtp";
import {
  cancelSystemQrInvoice,
  checkSystemQrPayment,
  createSystemQrInvoice,
} from "./systemqr";

export const mentorForm = "study-mentor-meeting";
export const mentorFee = 1_000_000;
const merchantCode = "MGL_STEPPE_1783745574446";
const accountNumber = "320005005252080629";
const recipient = "togskhurts@gmail.com";
const holdMs = 15 * 60_000;
const state = (phase: string) => ({ path: ["phase"], equals: phase });
export const slotId = (time: string) => mentorForm + "-" + time;

async function credentials() {
  const setting = await prisma.siteSetting.findUnique({
    where: { key: "contract-payment-accounts" },
  });
  const accounts: unknown = JSON.parse(setting?.value || "[]");
  const account: unknown =
    Array.isArray(accounts) &&
    accounts.find(
      (v: unknown) =>
        v &&
        typeof v === "object" &&
        "merchantCode" in v &&
        v.merchantCode === merchantCode,
    );
  if (account && typeof account === "object") {
    if (
      !("accountNumber" in account) ||
      String(account.accountNumber).replace(/\s/g, "") !== accountNumber
    )
      throw new Error("Mentor settlement account mismatch");
    if (
      "password" in account &&
      typeof account.password === "string" &&
      account.password.trim()
    )
      return {
        username:
          ("username" in account &&
            typeof account.username === "string" &&
            account.username.trim()) ||
          merchantCode,
        password: account.password.trim(),
      };
  } else if (process.env.ESIM_MINU_MERCHANT_CODE?.trim() !== merchantCode) {
    throw new Error("Mentor payment account unavailable");
  }
  const username = process.env.SYSTEMQR_USERNAME?.trim(),
    password = process.env.SYSTEMQR_PASSWORD?.trim();
  if (!username || !password)
    throw new Error("Mentor payment credentials unavailable");
  return { username, password };
}

export async function createMentorPayment(
  formId: string,
  details: { name: string; phone: string; requestedTime: string },
) {
  const auth = await credentials();
  const base = process.env.API_PUBLIC_URL?.replace(/\/+$/, "");
  if (!base?.startsWith("https://"))
    throw new Error("Public callback unavailable");
  const reference = randomUUID();
  const id = slotId(details.requestedTime);
  const expiresAt = new Date(Date.now() + holdMs).toISOString();
  const data = {
    ...details,
    mentor: "В. Есөнтөмөр",
    amount: mentorFee,
    reference,
    expiresAt,
    phase: "creating",
    paymentStatus: "Төлбөр хүлээгдэж байна",
  };
  await prisma.formResponse.create({ data: { id, formId, data } });
  const expected = { id, data: { equals: data } };
  try {
    const params = new URLSearchParams({
      invoiceId: reference,
      projectId: details.requestedTime,
    });
    const invoice = await createSystemQrInvoice(
      {
        merchantCode,
        amount: mentorFee,
        referenceNumber: reference,
        webhook:
          base + "/api/forms/" + mentorForm + "/payment/callback?" + params,
      },
      auth.username,
      auth.password,
    );
    const updated = await prisma.formResponse.updateMany({
      where: expected,
      data: {
        data: {
          ...data,
          phase: "pending",
          providerId: String(invoice.invoiceId),
        },
      },
    });
    if (!updated.count) throw new Error("Reservation expired");
    return {
      invoiceId: reference,
      amount: mentorFee,
      expiresAt,
      qrText: String(invoice.qrText),
      qrImage: "",
      urls: invoice.urls,
    };
  } catch (error) {
    // No QR has been returned to the customer.
    await prisma.formResponse.deleteMany({ where: expected });
    throw error;
  }
}

type BookingRow = { id: string; data: Prisma.JsonValue };
function record(row: BookingRow) {
  return Object.fromEntries(
    Object.entries(
      row.data && typeof row.data === "object" ? row.data : {},
    ).filter(
      (entry): entry is [string, string | number] =>
        typeof entry[1] === "string" || typeof entry[1] === "number",
    ),
  );
}

async function reconcile(row: BookingRow) {
  const data = record(row);
  if (data.phase === "paid") return true;
  if (data.phase !== "pending" || typeof data.providerId !== "string")
    return false;
  const auth = await credentials();
  const params = {
    merchantCode,
    invoiceNumber: data.providerId,
    expectedAmount: mentorFee,
  };
  const evidence = await checkSystemQrPayment(
    params,
    auth.username,
    auth.password,
  );
  const where = { id: row.id, data: { equals: data } };
  if (evidence.paid) {
    const settled = await prisma.formResponse.updateMany({
      where,
      data: {
        data: {
          ...data,
          phase: "paid",
          paymentStatus: "Төлсөн",
          mail: "queued",
        },
      },
    });
    if (settled.count) return true;
    const latest = await prisma.formResponse.findUnique({ where: { id: row.id } });
    return Boolean(latest && record(latest).phase === "paid" && record(latest).reference === data.reference);
  }
  if (Date.parse(String(data.expiresAt)) <= Date.now()) {
    // Only a successful provider cancellation releases a published QR's slot.
    await cancelSystemQrInvoice(params, auth.username, auth.password);
    await prisma.formResponse.deleteMany({ where });
  }
  return false;
}

export async function checkMentorPayment(time: string, reference: string) {
  const row = await prisma.formResponse.findUnique({
    where: { id: slotId(time) },
  });
  if (!row || record(row).reference !== reference) return null;
  return reconcile(row);
}

export function mentorNotice(data: Record<string, string | number>) {
  return {
    to: recipient,
    subject: "В. Есөнтөмөр · Уулзалтын шинэ захиалга",
    text: [
      String(data.requestedTime).replace("T", " ") + " (Улаанбаатарын цаг)",
      "Нэр: " + data.name,
      "Утас: " + data.phone,
      "Төлсөн дүн: 1,000,000 ₮",
      "Захиалгын дугаар: " + data.reference,
    ].join("\n"),
  };
}

async function deliver(row: BookingRow) {
  const data = record(row);
  const sending = {
    ...data,
    mail: "sending",
    lastAttempt: new Date().toISOString(),
  };
  const claimed = await prisma.formResponse.updateMany({
    where: { id: row.id, data: { equals: data } },
    data: { data: sending },
  });
  if (!claimed.count) return;
  await sendSmtpMail(mentorNotice(data));
  await prisma.formResponse.updateMany({
    where: { id: row.id, data: { equals: sending } },
    data: { data: { ...sending, mail: "sent" } },
  });
}

let running = false;
export async function processMentorBookings() {
  if (running) return;
  running = true;
  try {
    const expiry = new Date(Date.now() - holdMs);
    const scope = { form: { slug: mentorForm } };
    await prisma.formResponse.deleteMany({
      where: { ...scope, data: state("creating"), submittedAt: { lt: expiry } },
    });
    const pending = await prisma.formResponse.findMany({
      where: { ...scope, data: state("pending") },
      orderBy: { submittedAt: "asc" },
    });
    for (const row of pending) {
      try {
        await reconcile(row);
      } catch {
        console.error("[mentor] payment check deferred", row.id);
      }
    }
    if (!isSmtpConfigured()) return;
    const due = await prisma.formResponse.findMany({
      where: {
        ...scope,
        data: state("paid"),
        OR: [
          { data: { path: ["mail"], equals: "queued" } },
          {
            AND: [
              { data: { path: ["mail"], equals: "sending" } },
              { data: { path: ["lastAttempt"], lt: expiry.toISOString() } },
            ],
          },
        ],
      },
      take: 50,
    });
    for (const row of due) {
      try {
        await deliver(row);
      } catch {
        console.error("[mentor] notification delivery deferred", row.id);
      }
    }
  } finally {
    running = false;
  }
}
