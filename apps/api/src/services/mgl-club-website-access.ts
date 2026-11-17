import { prisma, type Prisma } from "@mgl/database";
import type { ClubWebsiteAccess } from "@mgl/types";
import { CLUB_GOLD_PRICE, clubGoldExpiresAt } from "./mgl-club-gold";

/** Read only server-verified Gold invoices. Company metadata never grants this benefit. */
export async function getClubWebsiteAccess(
  companyId: string,
  client: Pick<Prisma.TransactionClient, "qPayInvoice"> = prisma,
  now: Date = new Date(),
): Promise<ClubWebsiteAccess> {
  const reference = `MGL_CLUB_GOLD:${companyId}`;
  const invoices = await client.qPayInvoice.findMany({
    where: {
      saleReference: reference,
      status: "PAID",
      amount: CLUB_GOLD_PRICE,
      paidAt: { not: null },
    },
    orderBy: { paidAt: "desc" },
  });
  let latestExpiry: Date | null = null;
  for (const invoice of invoices) {
    const payload = invoice.webhookPayload;
    if (
      invoice.saleReference !== reference ||
      invoice.status !== "PAID" ||
      Number(invoice.amount) !== CLUB_GOLD_PRICE ||
      !(invoice.paidAt instanceof Date) ||
      !Number.isFinite(invoice.paidAt.getTime()) ||
      invoice.paidAt.getTime() > now.getTime() ||
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload) ||
      payload.kind !== "MGL_CLUB_GOLD" ||
      typeof payload.accessExpiresAt !== "string"
    )
      continue;
    const expiry = new Date(payload.accessExpiresAt);
    if (
      !Number.isFinite(expiry.getTime()) ||
      expiry.getTime() <= invoice.paidAt.getTime() ||
      expiry.getTime() > clubGoldExpiresAt(invoice.paidAt).getTime()
    )
      continue;
    if (!latestExpiry || expiry > latestExpiry) latestExpiry = expiry;
  }
  if (latestExpiry && latestExpiry.getTime() > now.getTime())
    return {
      eligible: true,
      status: "active",
      expiresAt: latestExpiry.toISOString(),
      message:
        "Алтан гишүүнчлэл идэвхтэй. Систем админ вэб танилцуулгыг бэлдэж, нийтлэх боломжтой.",
    };
  return {
    eligible: false,
    status: latestExpiry ? "expired" : "unpaid",
    expiresAt: latestExpiry?.toISOString() ?? null,
    message: latestExpiry
      ? "Алтан гишүүнчлэлийн хугацаа дууссан байна. Сунгалтын төлбөр баталгаажсаны дараа вэб танилцуулгаа засаж, нийтэлнэ."
      : "Вэб танилцуулга нь Алтан гишүүний эрх юм. Төлбөр баталгаажсаны дараа систем админ танилцуулгыг бэлдэнэ.",
  };
}

export class ClubWebsiteAccessError extends Error {
  readonly status = 403;
  constructor(public readonly access: ClubWebsiteAccess) {
    super(access.message);
  }
}
export async function requirePaidClubWebsite(
  companyId: string,
  client: Pick<Prisma.TransactionClient, "qPayInvoice"> = prisma,
) {
  const access = await getClubWebsiteAccess(companyId, client);
  if (!access.eligible) throw new ClubWebsiteAccessError(access);
  return access;
}
