import "dotenv/config";
import {
  DispatchStatus,
  PaymentStatus,
  Prisma,
  StockRequestStatus,
  prisma,
} from "@mgl/database";

const WAREHOUSE_NAME = "Туршилтын агуулах";
const PREFIX = "RETURN-DEMO";

type Scenario = {
  key: string;
  label: string;
  dispatchStatus: DispatchStatus;
  requestStatus: StockRequestStatus;
  paidRatio: number;
  itemCount: number;
  previousReturnRatio?: number;
};

const scenarios: Scenario[] = [
  { key: "01", label: "Төлбөргүй · 1 бараа", dispatchStatus: DispatchStatus.DELIVERED, requestStatus: StockRequestStatus.COMPLETED, paidRatio: 0, itemCount: 1 },
  { key: "02", label: "Төлбөргүй · 2 бараа", dispatchStatus: DispatchStatus.DELIVERED, requestStatus: StockRequestStatus.COMPLETED, paidRatio: 0, itemCount: 2 },
  { key: "03", label: "Төлбөргүй · 3 бараа", dispatchStatus: DispatchStatus.DELIVERED, requestStatus: StockRequestStatus.COMPLETED, paidRatio: 0, itemCount: 3 },
  { key: "04", label: "Төлбөргүй · 4 бараа", dispatchStatus: DispatchStatus.DELIVERED, requestStatus: StockRequestStatus.COMPLETED, paidRatio: 0, itemCount: 4 },
  { key: "05", label: "Төлбөргүй · хэсэгчлэн буцаасан", dispatchStatus: DispatchStatus.DELIVERED, requestStatus: StockRequestStatus.COMPLETED, paidRatio: 0, itemCount: 2, previousReturnRatio: 0.5 },
  { key: "06", label: "Төлбөргүй · бүрэн буцаасан", dispatchStatus: DispatchStatus.DELIVERED, requestStatus: StockRequestStatus.COMPLETED, paidRatio: 0, itemCount: 1, previousReturnRatio: 1 },
  { key: "07", label: "Төлбөргүй · их тоо", dispatchStatus: DispatchStatus.DELIVERED, requestStatus: StockRequestStatus.COMPLETED, paidRatio: 0, itemCount: 3 },
  { key: "08", label: "Төлбөргүй · өнөөдөр хүрсэн", dispatchStatus: DispatchStatus.DELIVERED, requestStatus: StockRequestStatus.COMPLETED, paidRatio: 0, itemCount: 2 },
  { key: "09", label: "Хэсэгчилсэн төлбөртэй", dispatchStatus: DispatchStatus.DELIVERED, requestStatus: StockRequestStatus.COMPLETED, paidRatio: 0.25, itemCount: 2 },
  { key: "10", label: "Хэсэгчилсэн төлбөртэй 50%", dispatchStatus: DispatchStatus.DELIVERED, requestStatus: StockRequestStatus.COMPLETED, paidRatio: 0.5, itemCount: 3 },
  { key: "11", label: "Бүрэн төлсөн", dispatchStatus: DispatchStatus.DELIVERED, requestStatus: StockRequestStatus.COMPLETED, paidRatio: 1, itemCount: 2 },
  { key: "12", label: "Бүрэн төлсөн · 4 бараа", dispatchStatus: DispatchStatus.DELIVERED, requestStatus: StockRequestStatus.COMPLETED, paidRatio: 1, itemCount: 4 },
  { key: "13", label: "Хүлээгдэж буй илгээмж", dispatchStatus: DispatchStatus.PENDING, requestStatus: StockRequestStatus.APPROVED, paidRatio: 0, itemCount: 2 },
  { key: "14", label: "Баталгаажсан илгээмж", dispatchStatus: DispatchStatus.CONFIRMED, requestStatus: StockRequestStatus.PROCESSING, paidRatio: 0, itemCount: 3 },
  { key: "15", label: "Илгээгдсэн, хүрээгүй", dispatchStatus: DispatchStatus.DISPATCHED, requestStatus: StockRequestStatus.PROCESSING, paidRatio: 0, itemCount: 2 },
];

async function main() {
  const warehouse = await prisma.warehouse.findFirstOrThrow({
    where: { name: WAREHOUSE_NAME, deletedAt: null },
    include: {
      createdBy: { select: { id: true } },
      organizations: { include: { organization: true } },
      inventories: {
        where: { quantity: { gt: 0 } },
        orderBy: { quantity: "desc" },
        take: 8,
        include: { product: { select: { id: true, name: true, price: true } } },
      },
    },
  });
  const organization =
    warehouse.organizations.find(({ organization }) => organization.name === "Test")
      ?.organization ?? warehouse.organizations[0]?.organization;
  if (!organization || !warehouse.createdBy || warehouse.inventories.length < 4) {
    throw new Error("Mock data-д хэрэгтэй байгууллага эсвэл бүтээгдэхүүн хүрэлцэхгүй байна");
  }
  const actorId = warehouse.createdBy.id;

  for (const [scenarioIndex, scenario] of scenarios.entries()) {
    const requestNumber = `${PREFIX}-${scenario.key}`;
    const requestedAt = new Date(Date.now() - scenarioIndex * 20 * 60_000);
    const selected = Array.from({ length: scenario.itemCount }, (_, index) =>
      warehouse.inventories[(scenarioIndex + index) % warehouse.inventories.length],
    );
    const quantities = selected.map((_, index) =>
      scenario.key === "07" ? 12 + index * 6 : 2 + index,
    );
    const totalAmount = selected.reduce(
      (total, row, index) => total + Number(row.product.price) * quantities[index],
      0,
    );
    const paidAmount = Math.round(totalAmount * scenario.paidRatio);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.warehouseStockRequest.findUnique({
        where: { requestNumber },
        select: { id: true, dispatch: { select: { id: true } } },
      });
      if (existing?.dispatch) {
        await tx.dispatchReturn.deleteMany({ where: { dispatchId: existing.dispatch.id } });
      }
      if (existing) {
        await tx.warehouseStockRequestItem.deleteMany({ where: { requestId: existing.id } });
      }

      const request = await tx.warehouseStockRequest.upsert({
        where: { requestNumber },
        update: {
          status: scenario.requestStatus,
          note: scenario.label,
          requestedAt,
          completedAt: scenario.dispatchStatus === DispatchStatus.DELIVERED ? requestedAt : null,
          items: {
            create: selected.map((row, index) => ({
              productId: row.productId,
              quantity: quantities[index],
              approvedQuantity: quantities[index],
            })),
          },
        },
        create: {
          requestNumber,
          organizationId: organization.id,
          warehouseId: warehouse.id,
          requestedById: actorId,
          reviewedById: actorId,
          status: scenario.requestStatus,
          note: scenario.label,
          deliveryAddress: "Улаанбаатар, Буцаалтын demo хаяг",
          deliveryPhone: `9912${scenario.key.padStart(4, "0")}`,
          requestedAt,
          reviewedAt: requestedAt,
          approvedAt: requestedAt,
          completedAt: scenario.dispatchStatus === DispatchStatus.DELIVERED ? requestedAt : null,
          items: {
            create: selected.map((row, index) => ({
              productId: row.productId,
              quantity: quantities[index],
              approvedQuantity: quantities[index],
            })),
          },
        },
        select: { id: true },
      });

      await tx.stockRequestPayment.upsert({
        where: { requestId: request.id },
        update: {
          totalAmount,
          paidAmount,
          status: scenario.paidRatio === 1 ? PaymentStatus.PAID : PaymentStatus.PENDING,
          paidAt: paidAmount > 0 ? requestedAt : null,
        },
        create: {
          invoiceNumber: `INV-${requestNumber}`,
          requestId: request.id,
          organizationId: organization.id,
          totalAmount,
          paidAmount,
          status: scenario.paidRatio === 1 ? PaymentStatus.PAID : PaymentStatus.PENDING,
          paidAt: paidAmount > 0 ? requestedAt : null,
          dueDate: new Date(Date.now() + 7 * 86_400_000),
          note: `Буцаалтын нөхцөл шалгах: ${scenario.label}`,
        },
      });

      const dispatch = await tx.stockDispatch.upsert({
        where: { requestId: request.id },
        update: {
          status: scenario.dispatchStatus,
          deliveredAt: scenario.dispatchStatus === DispatchStatus.DELIVERED ? requestedAt : null,
          dispatchedAt: scenario.dispatchStatus === DispatchStatus.PENDING ? null : requestedAt,
          note: scenario.label,
        },
        create: {
          dispatchNumber: `DSP-${requestNumber}`,
          requestId: request.id,
          warehouseId: warehouse.id,
          organizationId: organization.id,
          status: scenario.dispatchStatus,
          driverName: `Demo жолооч ${scenario.key}`,
          driverPhone: `9900${scenario.key.padStart(4, "0")}`,
          vehicleNumber: `УБА ${scenario.key.padStart(4, "0")}`,
          dispatchedAt: scenario.dispatchStatus === DispatchStatus.PENDING ? null : requestedAt,
          deliveredAt: scenario.dispatchStatus === DispatchStatus.DELIVERED ? requestedAt : null,
          note: scenario.label,
        },
        select: { id: true },
      });

      if (scenario.previousReturnRatio) {
        const quantity = Math.max(1, Math.round(quantities[0] * scenario.previousReturnRatio));
        await tx.dispatchReturn.create({
          data: {
            returnNumber: `RTN-${requestNumber}`,
            dispatchId: dispatch.id,
            warehouseId: warehouse.id,
            organizationId: organization.id,
            status: "PENDING",
            reason: scenario.previousReturnRatio === 1 ? "Бүрэн буцаалтын хүсэлт" : "Хэсэгчилсэн буцаалтын хүсэлт",
            items: { create: { productId: selected[0].productId, quantity } },
          },
        });
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  console.log(`${WAREHOUSE_NAME}: ${scenarios.length} буцаалтын mock падан бэлэн`);
  console.log("Төлбөргүй хүргэгдсэн: 8 · хэсэгчилсэн/төлсөн: 4 · бусад төлөв: 3");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
