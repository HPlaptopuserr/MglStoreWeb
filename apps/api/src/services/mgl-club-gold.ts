import { createHash, timingSafeEqual } from "node:crypto";
import { prisma, type Prisma } from "@mgl/database";
import { parseMglClubProfile } from "@mgl/types";
import { esimMinuConfig } from "./esim/minu-payment";
import { createSystemQrInvoice, checkSystemQrPayment } from "./systemqr";

export const CLUB_GOLD_PRICE = 1_200_000;
export class ClubGoldError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export function clubGoldExpiresAt(paidAt: Date): Date {
  const result = new Date(paidAt);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 6);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}
export function clubGoldTokenMatches(token: string, stored: unknown): boolean {
  if (
    !/^[0-9a-f]{64}$/.test(token) ||
    typeof stored !== "string" ||
    !/^[0-9a-f]{64}$/.test(stored)
  )
    return false;
  return timingSafeEqual(
    Buffer.from(stored, "hex"),
    createHash("sha256").update(token).digest(),
  );
}
function object(value: Prisma.JsonValue | null): Prisma.JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}
async function registration(id: string, token: string) {
  const row = await prisma.formResponse.findFirst({
    where: { id, form: { slug: "mgl-club", isActive: true } },
  });
  if (!row || !clubGoldTokenMatches(token, object(row.data).paymentTokenHash))
    throw new ClubGoldError(404, "Бүртгэлийн төлбөрийн холбоос олдсонгүй.");
  validateGoldProfile(row.data);
  return row;
}
function validateGoldProfile(data: Prisma.JsonValue) {
  const profile = parseMglClubProfile(data);
  if (!profile)
    throw new ClubGoldError(400, "Байгууллагын мэдээллээ шалгана уу.");
  if (!profile.logoUrl)
    throw new ClubGoldError(
      400,
      "Алтан гишүүн болохын өмнө байгууллагын лого оруулна уу.",
    );
}

export async function createClubGoldInvoiceForAdmin(registrationId: string) {
  const row = await prisma.formResponse.findFirst({
    where: { id: registrationId, form: { slug: "mgl-club", isActive: true } },
  });
  if (!row) throw new ClubGoldError(404, "Байгууллага олдсонгүй.");
  validateGoldProfile(row.data);
  return createInvoice(registrationId);
}
export async function createClubGoldInvoice(
  registrationId: string,
  token: string,
) {
  await registration(registrationId, token);
  return createInvoice(registrationId, { registrationId, token });
}
async function createInvoice(
  registrationId: string,
  credentials?: { registrationId: string; token: string },
) {
  const config = esimMinuConfig();
  const saleReference = `MGL_CLUB_GOLD:${registrationId}`;
  const outstanding = await prisma.qPayInvoice.findFirst({
    where: { saleReference, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  if (outstanding && object(outstanding.webhookPayload).providerInvoiceId) {
    if (credentials) await checkClubGoldInvoice(outstanding.id, credentials);
    else await checkClubGoldInvoiceForAdmin(registrationId, outstanding.id);
  }
  const intent = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "FormResponse" WHERE "id" = ${registrationId} FOR UPDATE`;
    const previous = await tx.qPayInvoice.findFirst({
      where: { saleReference, status: { in: ["PENDING", "PAID"] } },
      orderBy: { createdAt: "desc" },
    });
    if (previous) {
      const payload = object(previous.webhookPayload);
      if (
        previous.status === "PAID" &&
        typeof payload.accessExpiresAt === "string" &&
        new Date(payload.accessExpiresAt).getTime() > Date.now()
      )
        throw new ClubGoldError(409, "Таны Алтан гишүүнчлэл идэвхтэй байна.");
      if (
        previous.status === "PENDING" &&
        previous.expiresAt.getTime() > Date.now()
      ) {
        if (!payload.providerInvoiceId)
          throw new ClubGoldError(
            409,
            "Нэхэмжлэх бэлтгэж байна. Түр хүлээнэ үү.",
          );
        return { invoice: previous, created: false };
      }
    }
    const invoice = await tx.qPayInvoice.create({
      data: {
        amount: CLUB_GOLD_PRICE,
        qrText: "",
        expiresAt: new Date(Date.now() + 15 * 60_000),
        saleReference,
        webhookPayload: {
          kind: "MGL_CLUB_GOLD",
          merchantCode: config.merchantCode,
          username: config.username,
          registrationId,
          durationMonths: 6,
        },
      },
    });
    return { invoice, created: true };
  });
  if (!intent.created) return publicInvoice(intent.invoice);
  const invoice = intent.invoice;
  try {
    const publicUrl = process.env.API_PUBLIC_URL?.replace(/\/+$/, "");
    const result = await createSystemQrInvoice(
      {
        merchantCode: config.merchantCode,
        amount: CLUB_GOLD_PRICE,
        referenceNumber: invoice.id,
        webhook: publicUrl
          ? `${publicUrl}/api/forms/mgl-club/gold/callback?invoiceId=${invoice.id}`
          : undefined,
      },
      config.username,
      config.password,
    );
    if (!result.invoiceId || !result.qrText)
      throw new Error("Incomplete invoice");
    const saved = await prisma.qPayInvoice.update({
      where: { id: invoice.id },
      data: {
        qrText: result.qrText,
        webhookPayload: {
          ...object(invoice.webhookPayload),
          providerInvoiceId: String(result.invoiceId),
          deepLinks: result.urls as unknown as Prisma.InputJsonArray,
        },
      },
    });
    return publicInvoice(saved);
  } catch (error: unknown) {
    await prisma.qPayInvoice.updateMany({
      where: { id: invoice.id, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
    throw error;
  }
}
function publicInvoice(invoice: {
  id: string;
  amount: Prisma.Decimal;
  qrText: string;
  expiresAt: Date;
  webhookPayload: Prisma.JsonValue | null;
}) {
  return {
    invoiceId: invoice.id,
    amount: Number(invoice.amount),
    qrText: invoice.qrText,
    expiresAt: invoice.expiresAt.toISOString(),
    deepLinks: object(invoice.webhookPayload).deepLinks ?? [],
  };
}
export async function checkClubGoldInvoice(
  invoiceId: string,
  credentials?: { registrationId: string; token: string },
) {
  if (credentials)
    await registration(credentials.registrationId, credentials.token);
  return checkStoredInvoice(invoiceId, credentials?.registrationId);
}
export async function checkClubGoldInvoiceForAdmin(
  registrationId: string,
  invoiceId: string,
) {
  return checkStoredInvoice(invoiceId, registrationId);
}
async function checkStoredInvoice(invoiceId: string, registrationId?: string) {
  const invoice = await prisma.qPayInvoice.findFirst({
    where: {
      id: invoiceId,
      ...(registrationId
        ? { saleReference: `MGL_CLUB_GOLD:${registrationId}` }
        : {}),
    },
  });
  const payload = object(invoice?.webhookPayload ?? null);
  if (
    !invoice ||
    (registrationId &&
      invoice.saleReference !== `MGL_CLUB_GOLD:${registrationId}`) ||
    payload.kind !== "MGL_CLUB_GOLD" ||
    Number(invoice.amount) !== CLUB_GOLD_PRICE
  )
    throw new ClubGoldError(404, "Нэхэмжлэх олдсонгүй.");
  if (invoice.status === "PAID")
    return { status: "PAID", accessExpiresAt: payload.accessExpiresAt };
  if (
    invoice.status !== "PENDING" ||
    typeof payload.providerInvoiceId !== "string"
  )
    return { status: invoice.status };
  const config = esimMinuConfig();
  if (
    payload.username !== config.username ||
    typeof payload.merchantCode !== "string"
  )
    throw new ClubGoldError(503, "Төлбөрийн дансны тохиргоог шалгана уу.");
  const verification = await checkSystemQrPayment(
    {
      merchantCode: payload.merchantCode,
      invoiceNumber: payload.providerInvoiceId,
    },
    config.username,
    config.password,
  );
  if (!verification.paid)
    return {
      status: invoice.expiresAt.getTime() <= Date.now() ? "EXPIRED" : "PENDING",
    };
  const paidAt = new Date();
  const expiresAt = clubGoldExpiresAt(paidAt).toISOString();
  await prisma.qPayInvoice.updateMany({
    where: { id: invoice.id, status: "PENDING" },
    data: {
      status: "PAID",
      paidAt,
      paymentId: `CLUB:${payload.merchantCode}:${payload.providerInvoiceId}`,
      webhookPayload: { ...payload, accessExpiresAt: expiresAt },
    },
  });
  const settled = await prisma.qPayInvoice.findUniqueOrThrow({
    where: { id: invoice.id },
  });
  return {
    status: settled.status,
    accessExpiresAt: object(settled.webhookPayload).accessExpiresAt,
  };
}
