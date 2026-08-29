import path from "node:path";
import dotenv from "dotenv";
import { OrderStatus, PaymentStatus, prisma } from "@mgl/database";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
dotenv.config();

const TEST_ORDER_NUMBER = "TEST-NAMA-ORDER-001";

async function main() {
  const organization = await prisma.organization.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { name: { equals: "nama", mode: "insensitive" } },
        { slug: { equals: "nama", mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true },
  });
  if (!organization) throw new Error('"nama" дэлгүүр олдсонгүй.');

  const products = await prisma.product.findMany({
    where: {
      organizationId: organization.id,
      isActive: true,
      deletedAt: null,
    },
    orderBy: [{ supplyType: "desc" }, { createdAt: "asc" }],
    take: 2,
    select: { id: true, name: true, price: true },
  });
  if (!products.length) throw new Error('"nama" дэлгүүрт идэвхтэй бараа алга.');

  const customer = await prisma.user.findFirst({
    where: {
      isActive: true,
      deletedAt: null,
      organizationMemberships: {
        none: { organizationId: organization.id, deletedAt: null },
      },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  });
  if (!customer) throw new Error("Test захиалагч олдсонгүй.");

  const items = products.map((product, index) => {
    const quantity = index + 1;
    const price = Number(product.price);
    return {
      productId: product.id,
      productName: product.name,
      productSku: null,
      quantity,
      price,
      subtotal: price * quantity,
    };
  });
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);

  const order = await prisma.order.upsert({
    where: { orderNumber: TEST_ORDER_NUMBER },
    update: {
      organizationId: organization.id,
      customerId: customer.id,
      status: OrderStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PAID,
      shippingAddress: "Улаанбаатар хот, Test хүргэлтийн хаяг",
      phone: "99001122",
      note: "MGL Store ирсэн захиалгын дэлгэц шалгах test data",
      subtotal,
      total: subtotal,
      deletedAt: null,
      items: {
        deleteMany: {},
        create: items,
      },
    },
    create: {
      orderNumber: TEST_ORDER_NUMBER,
      organizationId: organization.id,
      customerId: customer.id,
      status: OrderStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PAID,
      shippingAddress: "Улаанбаатар хот, Test хүргэлтийн хаяг",
      phone: "99001122",
      note: "MGL Store ирсэн захиалгын дэлгэц шалгах test data",
      subtotal,
      total: subtotal,
      items: { create: items },
    },
    select: { id: true, orderNumber: true },
  });

  console.log(
    JSON.stringify(
      {
        customer: customer.email,
        detailPath: `/profile/organizations/${organization.id}?incomingOrders=1&orderId=${order.id}`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        organization: organization.name,
        products: items.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
        })),
        total: subtotal,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
