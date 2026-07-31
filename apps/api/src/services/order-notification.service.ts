import { OrgRole, prisma } from "@mgl/database";
import { emailService } from "./email/email.service";
import { orderEmailTemplates } from "./email/templates/order-email.templates";
import { sendPushToUsers } from "./push-notification.service";

export type CustomerOrderStage =
  | "ACCEPTED"
  | "PREPARING"
  | "COURIER_ACCEPTED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED";

export async function notifyNewOnlineOrderRequest(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      total: true,
      organization: {
        select: {
          members: {
            where: {
              isActive: true,
              deletedAt: null,
              role: { in: [OrgRole.OWNER, OrgRole.ADMIN] },
            },
            select: { userId: true },
          },
        },
      },
      items: {
        select: {
          product: { select: { managedByWarehouseId: true } },
        },
      },
    },
  });
  if (!order) return;

  const vendorUserIds = order.organization.members.map(
    (member) => member.userId,
  );
  const warehouseIds = Array.from(
    new Set(
      order.items
        .map((item) => item.product.managedByWarehouseId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const warehouseUsers =
    warehouseIds.length === 0
      ? []
      : await prisma.warehouseSetupToken.findMany({
          where: {
            warehouseId: { in: warehouseIds },
            usedAt: { not: null },
            user: { isActive: true, deletedAt: null },
          },
          distinct: ["userId"],
          select: { userId: true },
        });

  const body = `#${order.orderNumber} • ${Number(order.total).toLocaleString()}₮`;
  await Promise.all([
    sendPushToUsers({
      userIds: vendorUserIds,
      title: "Online захиалгын хүсэлт",
      body,
      data: {
        type: "new_online_order_request",
        target: "vendor",
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    }),
    sendPushToUsers({
      userIds: warehouseUsers.map((user) => user.userId),
      title: "Агуулахад шинэ захиалга ирлээ",
      body,
      data: {
        type: "new_online_order_request",
        target: "warehouse",
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    }),
  ]);
}

const CUSTOMER_STAGE_CONTENT: Record<
  CustomerOrderStage,
  { title: string; body: (orderNumber: string) => string }
> = {
  ACCEPTED: {
    title: "Захиалгыг хүлээн авлаа",
    body: (orderNumber) =>
      `Таны #${orderNumber} дугаартай захиалгын төлбөр амжилттай баталгаажиж, захиалгыг хүлээн авсныг мэдэгдье.`,
  },
  PREPARING: {
    title: "Захиалга бэлтгэгдэж байна",
    body: (orderNumber) =>
      `Таны #${orderNumber} дугаартай захиалгын бараа бэлтгэх ажиллагаа эхэлснийг мэдэгдье.`,
  },
  COURIER_ACCEPTED: {
    title: "Хүргэгч захиалгыг хүлээж авлаа",
    body: (orderNumber) =>
      `Таны #${orderNumber} дугаартай захиалгыг хүргэгч хүлээн авч, бараа авах цэгийн чиглэлд хөдөлснийг мэдэгдье.`,
  },
  OUT_FOR_DELIVERY: {
    title: "Захиалга хүргэлтэд гарлаа",
    body: (orderNumber) =>
      `Таны #${orderNumber} дугаартай захиалгыг хүргэгч хүлээн авч, хүргэх хаягийн чиглэлд хөдөлснийг мэдэгдье.`,
  },
  DELIVERED: {
    title: "Захиалга амжилттай хүргэгдлээ",
    body: (orderNumber) =>
      `Таны #${orderNumber} дугаартай захиалга амжилттай хүргэгдэж, хүлээлгэн өгснийг мэдэгдье.`,
  },
};

async function sendEmailSafely(input: {
  to: string | null | undefined;
  template: ReturnType<typeof orderEmailTemplates.customerStatus>;
}) {
  if (!input.to || !emailService.isConfigured()) return;
  try {
    await emailService.send({
      to: input.to,
      template: input.template,
    });
  } catch (error) {
    console.error("Order notification email failed", {
      to: input.to,
      subject: input.template.subject,
      error,
    });
  }
}

export async function notifyNewPaidOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      total: true,
      phone: true,
      shippingAddress: true,
      customer: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true, phoneNumber: true } },
        },
      },
      organization: {
        select: {
          id: true,
          name: true,
          email: true,
          members: {
            where: {
              isActive: true,
              deletedAt: null,
              role: { in: [OrgRole.OWNER, OrgRole.ADMIN] },
            },
            select: {
              userId: true,
              user: { select: { email: true } },
            },
          },
        },
      },
    },
  });
  if (!order) return;

  const customerName = order.customer.profile?.fullName || order.customer.email;
  const customerPhone =
    order.phone || order.customer.profile?.phoneNumber || "Бүртгэгдээгүй";
  const vendorEmails = Array.from(
    new Set(
      [
        order.organization.email,
        ...order.organization.members.map((member) => member.user.email),
      ].filter((email): email is string => Boolean(email)),
    ),
  );
  const vendorUserIds = order.organization.members.map(
    (member) => member.userId,
  );
  const vendorTemplate = orderEmailTemplates.newOrder({
    orderNumber: order.orderNumber,
    customerName,
    customerPhone,
    shippingAddress: order.shippingAddress,
    total: Number(order.total),
  });
  const acceptedTemplate = orderEmailTemplates.customerStatus({
    subject: CUSTOMER_STAGE_CONTENT.ACCEPTED.title,
    customerName,
    orderNumber: order.orderNumber,
    message: CUSTOMER_STAGE_CONTENT.ACCEPTED.body(order.orderNumber),
  });

  await Promise.all([
    ...vendorEmails.map((email) =>
      sendEmailSafely({
        to: email,
        template: vendorTemplate,
      }),
    ),
    sendEmailSafely({
      to: order.customer.email,
      template: acceptedTemplate,
    }),
    sendPushToUsers({
      userIds: vendorUserIds,
      title: "Шинэ захиалга ирлээ",
      body: `#${order.orderNumber} • ${customerName} • ${customerPhone}`,
      data: {
        type: "new_paid_order",
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    }),
    sendPushToUsers({
      userIds: [order.customer.id],
      title: CUSTOMER_STAGE_CONTENT.ACCEPTED.title,
      body: CUSTOMER_STAGE_CONTENT.ACCEPTED.body(order.orderNumber),
      data: {
        type: "order_status",
        stage: "ACCEPTED",
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    }),
  ]);
}

export async function notifyCustomerOrderStage(
  orderId: string,
  stage: CustomerOrderStage,
  options: { email?: boolean } = {},
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      customer: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true } },
        },
      },
    },
  });
  if (!order) return;

  const content = CUSTOMER_STAGE_CONTENT[stage];
  const body = content.body(order.orderNumber);
  const emailTemplate = orderEmailTemplates.customerStatus({
    subject: content.title,
    customerName: order.customer.profile?.fullName || order.customer.email,
    orderNumber: order.orderNumber,
    message: body,
  });
  await Promise.all([
    sendPushToUsers({
      userIds: [order.customer.id],
      title: content.title,
      body,
      data: {
        type: "order_status",
        stage,
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    }),
    options.email
      ? sendEmailSafely({
          to: order.customer.email,
          template: emailTemplate,
        })
      : Promise.resolve(),
  ]);
}
