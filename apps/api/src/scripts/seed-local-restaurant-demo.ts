import "../config/env";
import { prisma } from "@mgl/database";
import { randomBytes } from "node:crypto";

async function main() {
  const url = new URL(process.env.DATABASE_URL || "");
  if (
    process.env.NODE_ENV === "production" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  )
    throw new Error("This seed only supports a local database");
  const organizationId = process.argv[2];
  if (!organizationId) throw new Error("Pass the local organization ID");
  const owner = await prisma.organizationMember.findFirst({
    where: { organizationId, role: "OWNER", isActive: true, deletedAt: null },
    select: { userId: true },
  });
  if (!owner) throw new Error("Active owner not found");
  const prefix = `local-restaurant-${organizationId}`;
  const result = await prisma.$transaction(async (tx) => {
    const branch = await tx.branch.upsert({
      where: { id: `${prefix}-branch` },
      update: {},
      create: {
        id: `${prefix}-branch`,
        organizationId,
        name: "[ТЕСТ] Ресторан салбар",
        address: "Локал туршилтын хаяг",
      },
    });
    const register = await tx.posRegister.upsert({
      where: { id: `${prefix}-register` },
      update: {},
      create: {
        id: `${prefix}-register`,
        organizationId,
        branchId: branch.id,
        name: "[ТЕСТ] Касс 1",
        isActive: true,
        activationStatus: "APPROVED",
        cardEnabled: false,
        qpayEnabled: false,
        ebarimtEnabled: false,
      },
    });
    const shift = await tx.posShift.upsert({
      where: { id: `${prefix}-shift` },
      update: {},
      create: {
        id: `${prefix}-shift`,
        organizationId,
        branchId: branch.id,
        registerId: register.id,
        cashierId: owner.userId,
        openingCash: 100000,
        note: "[ТЕСТ] Локал туршилтын ээлж",
      },
    });
    const menu = [
      {
        name: "Хуушуур",
        price: 6000,
        costPrice: 3000,
        menuCategory: "HOT",
        kitchenStation: "HOT_KITCHEN",
      },
      {
        name: "Цуйван",
        price: 18000,
        costPrice: 9000,
        menuCategory: "HOT",
        kitchenStation: "HOT_KITCHEN",
      },
      {
        name: "Сүүтэй цай",
        price: 3000,
        costPrice: 1000,
        menuCategory: "DRINK",
        kitchenStation: "BAR",
      },
      {
        name: "Банштай цай",
        price: 12000,
        costPrice: 6000,
        menuCategory: "SOUP",
        kitchenStation: "HOT_KITCHEN",
      },
      {
        name: "Салат",
        price: 9000,
        costPrice: 4000,
        menuCategory: "COLD",
        kitchenStation: "COLD_KITCHEN",
      },
      {
        name: "Ундаа",
        price: 3500,
        costPrice: 1800,
        menuCategory: "DRINK",
        kitchenStation: "BAR",
      },
    ];
    const products = [];
    for (const [index, item] of menu.entries())
      products.push(
        await tx.product.upsert({
          where: { id: `${prefix}-product-${index}` },
          update: {},
          create: {
            ...item,
            id: `${prefix}-product-${index}`,
            organizationId,
            name: `[ТЕСТ] ${item.name}`,
            sku: `LOCAL-REST-${index}`,
            unit: "pcs",
            stock: 100,
            isActive: true,
            isRestaurantMenuItem: true,
            preparationMinutes: 10,
            taxType: "NOT_VAT",
          },
        }),
      );
    for (let index = 0; index < 6; index++) {
      const table = await tx.restaurantTable.upsert({
        where: { id: `${prefix}-table-${index}` },
        update: {},
        create: {
          id: `${prefix}-table-${index}`,
          organizationId,
          branchId: branch.id,
          code: `TEST-A${index + 1}`,
          label: `A${index + 1}`,
          zone: "[ТЕСТ] Гол заал",
          seats: 4,
          sortOrder: index,
          qrToken: randomBytes(24).toString("base64url"),
        },
      });
      if (
        index >= 4 ||
        (await tx.restaurantTicket.findUnique({
          where: { id: `${prefix}-ticket-${index}` },
        }))
      )
        continue;
      const product = products[index];
      const status = (["OPEN", "KITCHEN", "READY", "PAID"] as const)[index];
      const paid = status === "PAID";
      const amount = Number(product.price) * 2;
      const sale = paid
        ? await tx.posSale.create({
            data: {
              organizationId,
              branchId: branch.id,
              registerId: register.id,
              shiftId: shift.id,
              cashierId: owner.userId,
              receiptNo: `${prefix}-cash-sale`,
              paymentMethod: "CASH",
              subtotal: amount,
              taxTotal: 0,
              discountTotal: 0,
              grandTotal: amount,
              note: "[ТЕСТ] Зохиомол бэлэн төлбөр. Бодит гүйлгээ биш.",
              lines: {
                create: {
                  productId: product.id,
                  productName: product.name,
                  qty: 2,
                  unitPrice: product.price,
                  taxAmount: 0,
                  taxType: "NOT_VAT",
                  taxRate: 0,
                  discount: 0,
                  lineTotal: amount,
                  unitCost: product.costPrice,
                  costTotal: Number(product.costPrice) * 2,
                },
              },
            },
          })
        : null;
      const ticket = await tx.restaurantTicket.create({
        data: {
          id: `${prefix}-ticket-${index}`,
          ticketNo: `${prefix}-RT-${index + 1}`,
          organizationId,
          branchId: branch.id,
          shiftId: shift.id,
          tableId: table.id,
          openedById: owner.userId,
          status,
          posSaleId: sale?.id,
          sentAt: index > 0 ? new Date() : null,
          closedAt: paid ? new Date() : null,
          note: "[ТЕСТ] Локал рестораны жишээ",
          items: {
            create: {
              productId: product.id,
              productName: product.name,
              unitPrice: product.price,
              qty: 2,
              sentQty: index > 0 ? 2 : 0,
              kitchenStation: product.kitchenStation,
              preparationMinutes: 10,
            },
          },
        },
        include: { items: true },
      });
      if (index > 0)
        await tx.kitchenTicket.create({
          data: {
            kitchenTicketNo: `${prefix}-KT-${index}`,
            organizationId,
            branchId: branch.id,
            restaurantTicketId: ticket.id,
            sentById: owner.userId,
            status: paid ? "SERVED" : index === 2 ? "READY" : "NEW",
            items: {
              create: {
                restaurantTicketItemId: ticket.items[0].id,
                productId: product.id,
                productName: product.name,
                qty: 2,
                kitchenStation: product.kitchenStation,
                preparationMinutes: 10,
              },
            },
          },
        });
    }
    return {
      branch: branch.name,
      register: register.name,
      menuItems: products.length,
      tables: 6,
      tickets: 4,
    };
  });
  console.log(JSON.stringify(result));
}
main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Seed failed");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
