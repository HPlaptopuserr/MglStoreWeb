import { prisma } from "@mgl/database";
import { emailService } from "../email/email.service";
import { emailLayout, safe } from "../email/email-layout";
let running = false;
export async function processWorkforceMailQueue(
  scope: { organizationId?: string } = {},
) {
  if (running) return;
  running = true;
  try {
    await prisma.workforceLocationPoint.deleteMany({
      where: {
        ...(scope.organizationId
          ? { organizationId: scope.organizationId }
          : {}),
        createdAt: { lt: new Date(Date.now() - 30 * 86400000) },
      },
    });
    if (!emailService.isConfigured()) return;
    const expired = new Date(Date.now() - 15 * 60000);
    // SMTP cannot guarantee idempotency after a process crash: leave uncertain deliveries for review.
    await prisma.workforceMailDelivery.updateMany({
      where: {
        ...(scope.organizationId
          ? { campaign: { organizationId: scope.organizationId } }
          : {}),
        state: "SENDING",
        updatedAt: { lt: expired },
      },
      data: {
        state: "UNCERTAIN",
        lastError:
          "Илгээлтийн үед холболт тасарсан. Давтан илгээхийн өмнө шалгана уу.",
      },
    });
    const deliveries = await prisma.workforceMailDelivery.findMany({
      where: {
        ...(scope.organizationId
          ? { campaign: { organizationId: scope.organizationId } }
          : {}),
        state: "PENDING",
      },
      include: {
        campaign: {
          include: {
            organization: {
              select: {
                name: true,
                businessAttendanceEnabled: true,
                workforceSubscription: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "asc" },
      take: 10,
    });
    for (const delivery of deliveries) {
      const claimed = await prisma.workforceMailDelivery.updateMany({
        where: { id: delivery.id, state: "PENDING" },
        data: { state: "SENDING", attempts: { increment: 1 } },
      });
      if (!claimed.count) continue;
      try {
        const org = delivery.campaign.organization;
        if (
          !org.businessAttendanceEnabled ||
          !org.workforceSubscription?.addons.includes("mail")
        )
          throw new Error("Үйлчилгээ идэвхгүй болсон");
        await emailService.send({
          to: delivery.email,
          template: {
            subject: delivery.campaign.title,
            text: `${org.name}\n\n${delivery.campaign.content}`,
            html: emailLayout({
              eyebrow: org.name,
              title: delivery.campaign.title,
              preview: delivery.campaign.content.slice(0, 150),
              content: `<p style="white-space:pre-wrap;line-height:1.8">${safe(delivery.campaign.content)}</p>`,
            }),
          },
        });
        await prisma.workforceMailDelivery.update({
          where: { id: delivery.id },
          data: { state: "SENT", sentAt: new Date(), lastError: null },
        });
      } catch {
        await prisma.workforceMailDelivery.update({
          where: { id: delivery.id },
          data: {
            state: "FAILED",
            lastError:
              "Имэйл илгээж чадсангүй. Серверийн тохиргоо болон хаягийг шалгана уу.",
          },
        });
      }
    }
  } catch (error) {
    console.error(
      "[workforce mail queue]",
      error instanceof Error ? error.message : "Queue error",
    );
  } finally {
    running = false;
  }
}
