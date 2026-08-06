import { OrgRole, prisma } from "@mgl/database";

import { sendPushToUsers } from "./push-notification.service";

export async function notifyNewSalesRepresentativeStockRequest(
  requestId: string,
): Promise<void> {
  const request = await prisma.warehouseStockRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      requestNumber: true,
      organization: {
        select: {
          name: true,
          members: {
            where: {
              isActive: true,
              deletedAt: null,
              role: { in: [OrgRole.OWNER, OrgRole.ADMIN] },
              user: { isActive: true, deletedAt: null },
            },
            select: { userId: true },
          },
        },
      },
      warehouse: {
        select: {
          setupTokens: {
            where: {
              usedAt: { not: null },
              user: { isActive: true, deletedAt: null },
            },
            distinct: ["userId"],
            select: { userId: true },
          },
        },
      },
    },
  });
  if (!request) return;

  const body = `#${request.requestNumber} • ${request.organization.name}`;

  await Promise.all([
    sendPushToUsers({
      userIds: request.organization.members.map((member) => member.userId),
      title: "Х/Т шинэ бараа таталтын хүсэлт үүсгэлээ",
      body,
      data: {
        type: "sales_representative_stock_request",
        target: "vendor",
        requestId: request.id,
        requestNumber: request.requestNumber,
      },
    }),
    sendPushToUsers({
      userIds: [
        ...request.warehouse.setupTokens.map((token) => token.userId),
      ],
      title: "Агуулахад Х/Т шинэ хүсэлт ирлээ",
      body,
      data: {
        type: "sales_representative_stock_request",
        target: "warehouse",
        requestId: request.id,
        requestNumber: request.requestNumber,
      },
    }),
  ]);
}
