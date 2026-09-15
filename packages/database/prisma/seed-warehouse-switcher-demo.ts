import crypto from "crypto";
import {
  DispatchStatus,
  InventoryReason,
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
  StockRequestStatus,
  WarehouseType,
} from "@prisma/client";

const prisma = new PrismaClient();
const MOCK_WAREHOUSE_NAME = "Туршилтын агуулах";
const MOCK_WAREHOUSE_ADDRESS = "Улаанбаатар, Баянзүрх дүүрэг, Demo бүс";

function readEmailArgument() {
  const emailFlagIndex = process.argv.indexOf("--email");
  const email =
    emailFlagIndex >= 0 ? process.argv[emailFlagIndex + 1]?.trim() : undefined;
  if (!email) {
    throw new Error(
      "Хэрэглэгчийн имэйлийг --email user@example.com хэлбэрээр оруулна уу.",
    );
  }
  return email.toLowerCase();
}

function assertLocalDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL тохируулагдаагүй байна.");

  const hostname = new URL(databaseUrl).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) {
    throw new Error(
      `Mock seed зөвхөн local database дээр ажиллана. Одоогийн host: ${hostname}`,
    );
  }
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1_000);
}

async function main() {
  assertLocalDatabase();
  const email = readEmailArgument();
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null, isActive: true },
    select: { id: true, email: true },
  });
  if (!user) throw new Error(`Идэвхтэй хэрэглэгч олдсонгүй: ${email}`);

  const sourceAssignment = await prisma.warehouseSetupToken.findFirst({
    where: {
      userId: user.id,
      usedAt: { not: null },
      warehouse: { deletedAt: null, isActive: true },
    },
    orderBy: { createdAt: "asc" },
    select: {
      warehouse: {
        select: {
          id: true,
          organizations: { select: { organizationId: true } },
          inventories: {
            orderBy: { updatedAt: "desc" },
            take: 16,
            select: { productId: true },
          },
        },
      },
    },
  });
  if (!sourceAssignment) {
    throw new Error("Хэрэглэгчид холбогдсон эх агуулах олдсонгүй.");
  }

  const sourceWarehouse = sourceAssignment.warehouse;
  const organizationIds = sourceWarehouse.organizations.map(
    ({ organizationId }) => organizationId,
  );
  const productIds = sourceWarehouse.inventories.map(({ productId }) => productId);
  if (productIds.length === 0) {
    throw new Error("Эх агуулахад хуулж турших бараа алга байна.");
  }

  const existingMockWarehouse = await prisma.warehouse.findFirst({
    where: {
      name: MOCK_WAREHOUSE_NAME,
      address: MOCK_WAREHOUSE_ADDRESS,
      createdById: user.id,
      deletedAt: null,
    },
    select: { id: true },
  });

  const mockWarehouse = existingMockWarehouse
    ? await prisma.warehouse.update({
        where: { id: existingMockWarehouse.id },
        data: { isActive: true, type: WarehouseType.CENTRAL },
        select: { id: true, name: true },
      })
    : await prisma.warehouse.create({
        data: {
          name: MOCK_WAREHOUSE_NAME,
          address: MOCK_WAREHOUSE_ADDRESS,
          city: "Улаанбаатар",
          district: "Баянзүрх",
          phone: "7700-TEST",
          capacity: 5_000,
          type: WarehouseType.CENTRAL,
          createdById: user.id,
        },
        select: { id: true, name: true },
      });

  const assignment = await prisma.warehouseSetupToken.findFirst({
    where: { userId: user.id, warehouseId: mockWarehouse.id },
    select: { id: true },
  });
  if (assignment) {
    await prisma.warehouseSetupToken.update({
      where: { id: assignment.id },
      data: { usedAt: new Date() },
    });
  } else {
    await prisma.warehouseSetupToken.create({
      data: {
        userId: user.id,
        warehouseId: mockWarehouse.id,
        token: `local-demo-${crypto.randomUUID()}`,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1_000),
        usedAt: new Date(),
      },
    });
  }

  await Promise.all(
    organizationIds.map((organizationId) =>
      prisma.warehouseOrganization.upsert({
        where: {
          warehouseId_organizationId: {
            warehouseId: mockWarehouse.id,
            organizationId,
          },
        },
        update: {},
        create: {
          warehouseId: mockWarehouse.id,
          organizationId,
          assignedById: user.id,
        },
      }),
    ),
  );

  const organizationId = organizationIds[0];
  if (!organizationId) {
    throw new Error("Mock хүсэлт үүсгэх байгууллага олдсонгүй.");
  }
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, price: true },
  });
  const requestScenarios = [
    {
      suffix: "PENDING",
      days: 1,
      status: StockRequestStatus.PENDING,
      payment: null,
      dispatch: null,
    },
    {
      suffix: "OVERDUE-30",
      days: 35,
      status: StockRequestStatus.APPROVED,
      payment: { paidRatio: 0, dueDaysAgo: 30 },
      dispatch: null,
    },
    {
      suffix: "OVERDUE-14",
      days: 20,
      status: StockRequestStatus.APPROVED,
      payment: { paidRatio: 0, dueDaysAgo: 14 },
      dispatch: null,
    },
    {
      suffix: "PARTIAL",
      days: 10,
      status: StockRequestStatus.PROCESSING,
      payment: { paidRatio: 0.4, dueDaysAgo: 5 },
      dispatch: DispatchStatus.PENDING,
    },
    {
      suffix: "PAID",
      days: 5,
      status: StockRequestStatus.PROCESSING,
      payment: { paidRatio: 1, dueDaysAgo: -2 },
      dispatch: DispatchStatus.CONFIRMED,
    },
    {
      suffix: "COMPLETED",
      days: 16,
      status: StockRequestStatus.COMPLETED,
      payment: { paidRatio: 1, dueDaysAgo: 10 },
      dispatch: DispatchStatus.DELIVERED,
    },
  ] as const;
  const requestPrefix = `LOCAL-${mockWarehouse.id.slice(0, 8).toUpperCase()}`;

  for (const [scenarioIndex, scenario] of requestScenarios.entries()) {
    const requestNumber = `${requestPrefix}-${scenario.suffix}`;
    const selectedProducts = products.slice(
      scenarioIndex % Math.max(1, products.length - 2),
      scenarioIndex % Math.max(1, products.length - 2) + 3,
    );
    const requestedAt = daysAgo(scenario.days);
    const request = await prisma.warehouseStockRequest.upsert({
      where: { requestNumber },
      update: {
        status: scenario.status,
        requestedAt,
        deliveryPhone: `9911${String(2200 + scenarioIndex).padStart(4, "0")}`,
      },
      create: {
        requestNumber,
        organizationId,
        warehouseId: mockWarehouse.id,
        requestedById: user.id,
        status: scenario.status,
        note: `Local demo хүсэлт — ${scenario.suffix}`,
        deliveryAddress: "Улаанбаатар, Demo хүргэлтийн хаяг",
        deliveryPhone: `9911${String(2200 + scenarioIndex).padStart(4, "0")}`,
        requestedAt,
        ...(scenario.status !== StockRequestStatus.PENDING
          ? { reviewedById: user.id, reviewedAt: requestedAt, approvedAt: requestedAt }
          : {}),
        ...(scenario.status === StockRequestStatus.COMPLETED
          ? { completedAt: daysAgo(14) }
          : {}),
      },
      select: { id: true },
    });

    await prisma.warehouseStockRequestItem.deleteMany({
      where: { requestId: request.id },
    });
    await prisma.warehouseStockRequestItem.createMany({
      data: selectedProducts.map((product, itemIndex) => ({
        requestId: request.id,
        productId: product.id,
        quantity: 2 + itemIndex * 3,
        approvedQuantity:
          scenario.status === StockRequestStatus.PENDING ? null : 2 + itemIndex * 3,
      })),
    });

    if (scenario.payment) {
      const totalAmount = selectedProducts.reduce(
        (sum, product, itemIndex) =>
          sum + Number(product.price) * (2 + itemIndex * 3),
        0,
      );
      const paidAmount = Math.round(totalAmount * scenario.payment.paidRatio);
      const fullyPaid = paidAmount >= totalAmount;
      const payment = await prisma.stockRequestPayment.upsert({
        where: { requestId: request.id },
        update: {
          totalAmount,
          paidAmount,
          status: fullyPaid ? PaymentStatus.PAID : PaymentStatus.PENDING,
          paymentMethod: paidAmount > 0 ? PaymentMethod.BANK_TRANSFER : null,
          dueDate: daysAgo(scenario.payment.dueDaysAgo),
          paidAt: fullyPaid ? daysAgo(Math.max(0, scenario.days - 1)) : null,
        },
        create: {
          invoiceNumber: `INV-${requestPrefix}-${scenario.suffix}`,
          requestId: request.id,
          organizationId,
          totalAmount,
          paidAmount,
          status: fullyPaid ? PaymentStatus.PAID : PaymentStatus.PENDING,
          paymentMethod: paidAmount > 0 ? PaymentMethod.BANK_TRANSFER : null,
          dueDate: daysAgo(scenario.payment.dueDaysAgo),
          paidAt: fullyPaid ? daysAgo(Math.max(0, scenario.days - 1)) : null,
          note: "Local warehouse payment demo",
        },
        select: { id: true },
      });
      await prisma.stockRequestPaymentEntry.deleteMany({
        where: { paymentId: payment.id },
      });
      if (paidAmount > 0) {
        await prisma.stockRequestPaymentEntry.create({
          data: {
            paymentId: payment.id,
            amount: paidAmount,
            method: PaymentMethod.BANK_TRANSFER,
            status: PaymentStatus.PAID,
            transactionId: `LOCAL-${request.id}`,
            confirmedById: user.id,
            confirmedAt: daysAgo(Math.max(0, scenario.days - 1)),
            note: "Local demo төлөлт",
          },
        });
      }
    }

    if (scenario.dispatch) {
      await prisma.stockDispatch.upsert({
        where: { requestId: request.id },
        update: { status: scenario.dispatch },
        create: {
          dispatchNumber: `DSP-${requestPrefix}-${scenario.suffix}`,
          requestId: request.id,
          warehouseId: mockWarehouse.id,
          organizationId,
          status: scenario.dispatch,
          driverName: "Demo жолооч",
          driverPhone: "99001122",
          vehicleNumber: "УБА 1234",
          dispatchedAt:
            scenario.dispatch === DispatchStatus.PENDING
              ? null
              : daysAgo(Math.max(0, scenario.days - 2)),
          deliveredAt:
            scenario.dispatch === DispatchStatus.DELIVERED ? daysAgo(14) : null,
          note: "Local demo илгээмж",
        },
      });
    }
  }

  await prisma.inventoryLedger.deleteMany({
    where: { referenceType: "LOCAL_WAREHOUSE_DEMO", referenceId: mockWarehouse.id },
  });
  await prisma.inventoryLedger.createMany({
    data: productIds.slice(0, 10).map((productId, index) => ({
      productId,
      change: index % 3 === 0 ? -(index + 1) : 10 + index * 2,
      reason:
        index % 3 === 0 ? InventoryReason.ORDER : InventoryReason.RESTOCK,
      note: `Local demo хөдөлгөөн #${index + 1}`,
      createdById: user.id,
      referenceType: "LOCAL_WAREHOUSE_DEMO",
      referenceId: mockWarehouse.id,
      createdAt: daysAgo(index),
    })),
  });

  const quantities = [48, 3, 0, 126, 8, 21, 1, 64, 15, 0, 92, 6, 33, 2, 74, 11];
  await Promise.all(
    productIds.map((productId, index) => {
      const quantity = quantities[index % quantities.length];
      return prisma.warehouseInventory.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: mockWarehouse.id,
            productId,
          },
        },
        update: {
          quantity,
          minQuantity: 5,
          maxQuantity: 200,
          location: `DEMO-${String(index + 1).padStart(2, "0")}`,
          batchNumber: `DEMO-${String(index + 1).padStart(3, "0")}`,
          lastRestockedAt: new Date(),
          note: "Warehouse switcher-ийн local туршилтын дата",
        },
        create: {
          warehouseId: mockWarehouse.id,
          productId,
          quantity,
          minQuantity: 5,
          maxQuantity: 200,
          location: `DEMO-${String(index + 1).padStart(2, "0")}`,
          batchNumber: `DEMO-${String(index + 1).padStart(3, "0")}`,
          lastRestockedAt: new Date(),
          note: "Warehouse switcher-ийн local туршилтын дата",
        },
      });
    }),
  );

  console.log(`Mock warehouse ready: ${mockWarehouse.name}`);
  console.log(`Assigned user: ${user.email}`);
  console.log(`Inventory items: ${productIds.length}`);
  console.log(`Stock requests: ${requestScenarios.length}`);
  console.log("Payments: unpaid, partial and paid scenarios ready");
  console.log("Dispatches and inventory movements ready");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
