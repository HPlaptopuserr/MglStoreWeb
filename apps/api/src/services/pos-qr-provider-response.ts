import { prisma, type Prisma } from "@mgl/database";

/** A late provider reply must retain cancellation/review and callback evidence. */
export async function recordPosQrProviderResponse(input: {
  invoiceId: string;
  qrText: string;
  metadata: Prisma.InputJsonObject;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "QPayInvoice" WHERE "id" = ${input.invoiceId} FOR UPDATE`;
    const current = await tx.qPayInvoice.findUniqueOrThrow({
      where: { id: input.invoiceId },
    });
    const payload = current.webhookPayload;
    const saved =
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload
        : {};
    return tx.qPayInvoice.update({
      where: { id: input.invoiceId },
      data: {
        qrText: input.qrText,
        webhookPayload: { ...saved, ...input.metadata },
      },
    });
  });
}
