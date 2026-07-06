import path from "path";
import dotenv from "dotenv";
import {
  KitchenTicketStatus,
  PosSaleStatus,
  prisma,
  RestaurantTicketStatus,
} from "@mgl/database";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
dotenv.config();

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = Math.max(1, Number(limitArg?.split("=")[1] || 500));

function appendVoidNote(note: string | null, receiptNo: string, reason: string | null) {
  const marker = `VOID ${receiptNo}`;
  const current = note?.trim() || "";
  if (current.includes(marker)) return current;

  const line = reason ? `${marker}: ${reason}` : marker;
  return current ? `${current}\n${line}` : line;
}

async function main() {
  const tickets = await prisma.restaurantTicket.findMany({
    where: {
      status: { not: RestaurantTicketStatus.CANCELLED },
      posSale: { status: PosSaleStatus.VOIDED },
    },
    select: {
      id: true,
      ticketNo: true,
      status: true,
      note: true,
      posSale: {
        select: {
          receiptNo: true,
          voidedAt: true,
          voidReason: true,
        },
      },
    },
    orderBy: { updatedAt: "asc" },
    take: limit,
  });

  console.log(
    `${apply ? "APPLY" : "DRY-RUN"} voided restaurant ticket sync: ${tickets.length} ticket(s) found`,
  );

  for (const ticket of tickets) {
    const sale = ticket.posSale;
    if (!sale) continue;

    const cancelledAt = sale.voidedAt || new Date();
    const nextNote = appendVoidNote(ticket.note, sale.receiptNo, sale.voidReason);

    console.log(
      `- ${ticket.ticketNo} ${ticket.status} -> CANCELLED (receipt ${sale.receiptNo})`,
    );

    if (!apply) continue;

    await prisma.$transaction(async (tx) => {
      await tx.restaurantTicket.update({
        where: { id: ticket.id },
        data: {
          status: RestaurantTicketStatus.CANCELLED,
          closedAt: cancelledAt,
          note: nextNote,
        },
      });

      await tx.kitchenTicket.updateMany({
        where: {
          restaurantTicketId: ticket.id,
          status: {
            in: [
              KitchenTicketStatus.NEW,
              KitchenTicketStatus.PREPARING,
              KitchenTicketStatus.READY,
            ],
          },
        },
        data: {
          status: KitchenTicketStatus.CANCELLED,
          cancelledAt,
        },
      });
    });
  }

  if (!apply && tickets.length > 0) {
    console.log("Run again with --apply to update these tickets.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
