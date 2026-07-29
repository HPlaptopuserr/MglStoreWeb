import {
  DeliveryPartnershipStatus,
  DeliverySourceType,
  DeliveryStatus,
  type Prisma,
} from "@mgl/database";

type DatabaseClient = Prisma.TransactionClient;

function trackingCode(prefix: string, reference: string) {
  const suffix = reference.replace(/[^A-Za-z0-9]/g, "").slice(-8).toUpperCase();
  return `${prefix}-${suffix}-${Date.now().toString().slice(-5)}`;
}

async function selectLeastLoadedPartnership(
  tx: DatabaseClient,
  where: Prisma.DeliveryPartnershipWhereInput,
) {
  const partnerships = await tx.deliveryPartnership.findMany({
    where: {
      ...where,
      status: DeliveryPartnershipStatus.ACCEPTED,
      providerOrganization: {
        businessDeliveryEnabled: true,
        status: "ACTIVE",
        deletedAt: null,
      },
    },
    select: {
      id: true,
      providerOrganizationId: true,
      warehouseId: true,
      _count: {
        select: {
          deliveries: {
            where: {
              status: {
                in: [
                  DeliveryStatus.WAITING,
                  DeliveryStatus.PICKING,
                  DeliveryStatus.DELIVERING,
                ],
              },
            },
          },
        },
      },
    },
    orderBy: { respondedAt: "asc" },
  });

  return partnerships.sort(
    (left, right) =>
      left._count.deliveries - right._count.deliveries,
  )[0];
}

export async function routeOrderDelivery(
  tx: DatabaseClient,
  input: {
    orderId: string;
    sourceType: typeof DeliverySourceType.WEBSITE_ORDER | typeof DeliverySourceType.VENDOR_ORDER;
  },
) {
  const order = await tx.order.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      orderNumber: true,
      organizationId: true,
    },
  });
  if (!order) throw new Error("Захиалга олдсонгүй");

  const partnership = await selectLeastLoadedPartnership(tx, {
    requesterOrganizationId: order.organizationId,
  });

  return tx.delivery.upsert({
    where: { orderId: order.id },
    create: {
      orderId: order.id,
      sourceType: input.sourceType,
      requesterOrganizationId: order.organizationId,
      providerOrganizationId: partnership?.providerOrganizationId,
      partnershipId: partnership?.id,
      warehouseId: partnership?.warehouseId,
      status: DeliveryStatus.WAITING,
      trackingCode: trackingCode("ORD", order.orderNumber),
    },
    update: {
      sourceType: input.sourceType,
      requesterOrganizationId: order.organizationId,
      providerOrganizationId: partnership?.providerOrganizationId,
      partnershipId: partnership?.id,
      warehouseId: partnership?.warehouseId,
      status: DeliveryStatus.WAITING,
      cancelledAt: null,
    },
  });
}

export async function routeWarehouseDispatchDelivery(
  tx: DatabaseClient,
  stockDispatchId: string,
) {
  const dispatch = await tx.stockDispatch.findUnique({
    where: { id: stockDispatchId },
    select: {
      id: true,
      dispatchNumber: true,
      warehouseId: true,
      organizationId: true,
    },
  });
  if (!dispatch) throw new Error("Агуулахын илгээмж олдсонгүй");

  const partnership = await selectLeastLoadedPartnership(tx, {
    warehouseId: dispatch.warehouseId,
  });

  return tx.delivery.upsert({
    where: { stockDispatchId: dispatch.id },
    create: {
      stockDispatchId: dispatch.id,
      sourceType: DeliverySourceType.WAREHOUSE_DISPATCH,
      requesterOrganizationId: dispatch.organizationId,
      providerOrganizationId: partnership?.providerOrganizationId,
      partnershipId: partnership?.id,
      warehouseId: dispatch.warehouseId,
      status: DeliveryStatus.WAITING,
      trackingCode: trackingCode("WMS", dispatch.dispatchNumber),
    },
    update: {
      providerOrganizationId: partnership?.providerOrganizationId,
      partnershipId: partnership?.id,
      warehouseId: dispatch.warehouseId,
      status: DeliveryStatus.WAITING,
      cancelledAt: null,
    },
  });
}
