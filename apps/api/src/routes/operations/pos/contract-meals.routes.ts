import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Router, type Router as ExpressRouter } from "express";
import {
  InventoryReason,
  KitchenTicketStatus,
  Prisma,
  PosRegisterMode,
  RestaurantMealChargeStatus,
  RestaurantMealContractStatus,
  RestaurantOrderMode,
  RestaurantTicketStatus,
  ShiftStatus,
  prisma,
} from "@mgl/database";
import { SELF_SERVICE_TAKEAWAY_PACKAGING_FEE } from "@mgl/types";
import {
  adjustStock,
  resolveOrgWarehouse,
} from "../../../services/inventory.service";
import {
  canAccessPosOrganization,
  requirePosUser,
  roundMoney,
  type AuthUser,
} from "./_shared";

const router: ExpressRouter = Router();
const ULAANBAATAR_OFFSET_MS = 8 * 60 * 60 * 1000;
const EDITABLE_TICKET_STATUSES: RestaurantTicketStatus[] = [
  RestaurantTicketStatus.OPEN,
  RestaurantTicketStatus.KITCHEN,
  RestaurantTicketStatus.READY,
  RestaurantTicketStatus.SERVED,
];

type KnownError = Error & { status?: number };

const knownError = (status: number, message: string) =>
  Object.assign(new Error(message), { status });

const normalizeText = (value: unknown, maxLength: number) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);

export const isValidRestaurantMealContractPin = (value: unknown) =>
  /^\d{4}$/.test(String(value ?? "").trim());

const parseDateOnly = (value: unknown) => {
  const text = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dateOnlyKey = (value: Date) => value.toISOString().slice(0, 10);

export const ulaanbaatarDateKey = (value = new Date()) =>
  new Date(value.getTime() + ULAANBAATAR_OFFSET_MS).toISOString().slice(0, 10);

export const isRestaurantMealContractActive = (
  contract: {
    status: RestaurantMealContractStatus;
    startDate: Date;
    endDate: Date;
  },
  now = new Date(),
) => {
  const today = ulaanbaatarDateKey(now);
  return (
    contract.status === RestaurantMealContractStatus.ACTIVE &&
    dateOnlyKey(contract.startDate) <= today &&
    dateOnlyKey(contract.endDate) >= today
  );
};

const contractInclude = {
  _count: { select: { charges: true } },
} satisfies Prisma.RestaurantMealContractInclude;

type ContractWithCount = Prisma.RestaurantMealContractGetPayload<{
  include: typeof contractInclude;
}>;

const mapContract = (contract: ContractWithCount) => ({
  id: contract.id,
  organizationId: contract.organizationId,
  customerOrganization: contract.customerOrganization,
  customerRegisterNo: contract.customerRegisterNo,
  startDate: dateOnlyKey(contract.startDate),
  endDate: dateOnlyKey(contract.endDate),
  status: contract.status,
  activeNow: isRestaurantMealContractActive(contract),
  pinConfigured: Boolean(contract.pinHash),
  note: contract.note,
  chargeCount: contract._count.charges,
  createdAt: contract.createdAt.toISOString(),
  updatedAt: contract.updatedAt.toISOString(),
});

const getRequestedOrganizationId = (actor: AuthUser, requested: unknown) => {
  const organizationId = String(requested || actor.organizationId || "").trim();
  if (!organizationId) {
    throw knownError(400, "Байгууллагын мэдээлэл олдсонгүй");
  }
  if (!canAccessPosOrganization(actor, organizationId)) {
    throw knownError(
      403,
      "Энэ байгууллагын гэрээт хоолны мэдээлэлд хандах эрхгүй",
    );
  }
  return organizationId;
};

async function getAccessibleContract(
  actor: AuthUser,
  contractId: string,
  include: Prisma.RestaurantMealContractInclude = {},
) {
  const contract = await prisma.restaurantMealContract.findUnique({
    where: { id: contractId },
    include,
  });
  if (!contract) throw knownError(404, "Гэрээт байгууллага олдсонгүй");
  if (!canAccessPosOrganization(actor, contract.organizationId)) {
    throw knownError(403, "Энэ гэрээнд хандах эрхгүй");
  }
  return contract;
}

async function authenticateContract(input: {
  actor: AuthUser;
  branchId: string;
  contractId: string;
  pin: string;
}) {
  if (
    !input.branchId ||
    !input.contractId ||
    !isValidRestaurantMealContractPin(input.pin)
  ) {
    throw knownError(
      400,
      "Гэрээт байгууллага, 4 оронтой PIN болон салбар шаардлагатай",
    );
  }

  const [branch, contract] = await Promise.all([
    prisma.branch.findFirst({
      where: { id: input.branchId, deletedAt: null },
      select: { id: true, organizationId: true },
    }),
    prisma.restaurantMealContract.findUnique({
      where: { id: input.contractId },
    }),
  ]);
  if (
    !branch ||
    !canAccessPosOrganization(input.actor, branch.organizationId)
  ) {
    throw knownError(403, "Энэ салбарт хандах эрхгүй");
  }
  if (
    !contract ||
    contract.organizationId !== branch.organizationId ||
    !isRestaurantMealContractActive(contract)
  ) {
    throw knownError(403, "Гэрээт байгууллагын эрх идэвхгүй байна");
  }
  if (!contract.pinHash) {
    throw knownError(409, "Энэ байгууллагын 4 оронтой PIN тохируулаагүй байна");
  }
  if (!(await bcrypt.compare(input.pin, contract.pinHash))) {
    throw knownError(403, "PIN код буруу байна");
  }
  return { branch, contract };
}

const generateKitchenTicketNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = `${Date.now().toString().slice(-6)}${crypto
    .randomBytes(2)
    .toString("hex")
    .toUpperCase()}`;
  return `KT-${date}-${suffix}`;
};

router.get("/restaurant/contract-meals/options", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;
    const branchId = String(req.query.branchId || "").trim();
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, deletedAt: null },
      select: { id: true, organizationId: true },
    });
    if (!branch || !canAccessPosOrganization(actor, branch.organizationId)) {
      return res.status(403).json({ message: "Энэ салбарт хандах эрхгүй" });
    }
    const today = parseDateOnly(ulaanbaatarDateKey());
    if (!today) {
      return res.status(500).json({ message: "Огноо тооцоолж чадсангүй" });
    }
    const contracts = await prisma.restaurantMealContract.findMany({
      where: {
        organizationId: branch.organizationId,
        status: RestaurantMealContractStatus.ACTIVE,
        startDate: { lte: today },
        endDate: { gte: today },
        pinHash: { not: null },
      },
      orderBy: { customerOrganization: "asc" },
      select: {
        id: true,
        customerOrganization: true,
        customerRegisterNo: true,
        endDate: true,
      },
    });
    return res.json(
      contracts.map((contract) => ({
        id: contract.id,
        customerOrganization: contract.customerOrganization,
        customerRegisterNo: contract.customerRegisterNo,
        endDate: dateOnlyKey(contract.endDate),
      })),
    );
  } catch (error) {
    console.error("list restaurant meal contract options error", error);
    return res
      .status(500)
      .json({ message: "Гэрээт байгууллагын сонголт авахад алдаа гарлаа" });
  }
});

router.get("/restaurant/contract-meals/contracts", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;
    const organizationId = getRequestedOrganizationId(
      actor,
      req.query.organizationId,
    );
    const contracts = await prisma.restaurantMealContract.findMany({
      where: { organizationId },
      orderBy: [{ status: "asc" }, { endDate: "desc" }, { createdAt: "desc" }],
      include: contractInclude,
    });
    return res.json(contracts.map(mapContract));
  } catch (error) {
    const known = error as KnownError;
    if (known.status)
      return res.status(known.status).json({ message: known.message });
    console.error("list restaurant meal contracts error", error);
    return res
      .status(500)
      .json({ message: "Гэрээт байгууллагын жагсаалт авахад алдаа гарлаа" });
  }
});

router.post("/restaurant/contract-meals/contracts", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;
    const organizationId = getRequestedOrganizationId(
      actor,
      req.body?.organizationId,
    );
    const customerOrganization = normalizeText(
      req.body?.customerOrganization,
      200,
    );
    const customerRegisterNo =
      normalizeText(req.body?.customerRegisterNo, 20) || null;
    const startDate = parseDateOnly(req.body?.startDate);
    const endDate = parseDateOnly(req.body?.endDate);
    const pin = String(req.body?.pin || "").trim();
    if (
      !customerOrganization ||
      !startDate ||
      !endDate ||
      !isValidRestaurantMealContractPin(pin)
    ) {
      return res.status(400).json({
        message:
          "Байгууллагын нэр, гэрээний огноо болон 4 оронтой PIN шаардлагатай",
      });
    }
    if (endDate < startDate) {
      return res.status(400).json({
        message: "Гэрээний дуусах огноо эхлэх огнооноос өмнө байж болохгүй",
      });
    }

    const contract = await prisma.restaurantMealContract.create({
      data: {
        organizationId,
        customerOrganization,
        customerRegisterNo,
        startDate,
        endDate,
        pinHash: await bcrypt.hash(pin, 10),
        note: normalizeText(req.body?.note, 500) || null,
        createdById: actor.id,
      },
      include: contractInclude,
    });
    return res.status(201).json(mapContract(contract));
  } catch (error) {
    const known = error as KnownError;
    if (known.status)
      return res.status(known.status).json({ message: known.message });
    console.error("create restaurant meal contract error", error);
    return res
      .status(500)
      .json({ message: "Гэрээт байгууллага үүсгэхэд алдаа гарлаа" });
  }
});

router.patch("/restaurant/contract-meals/contracts/:id", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;
    const contractId = String(req.params.id || "").trim();
    const current = await getAccessibleContract(actor, contractId);
    const startDate =
      req.body?.startDate === undefined
        ? current.startDate
        : parseDateOnly(req.body.startDate);
    const endDate =
      req.body?.endDate === undefined
        ? current.endDate
        : parseDateOnly(req.body.endDate);
    if (!startDate || !endDate || endDate < startDate) {
      return res
        .status(400)
        .json({ message: "Гэрээний огнооны интервал буруу байна" });
    }
    const requestedStatus = String(
      req.body?.status || current.status,
    ).toUpperCase();
    if (
      !Object.values(RestaurantMealContractStatus).includes(
        requestedStatus as RestaurantMealContractStatus,
      )
    ) {
      return res.status(400).json({ message: "Гэрээний төлөв буруу байна" });
    }
    const customerOrganization =
      req.body?.customerOrganization === undefined
        ? current.customerOrganization
        : normalizeText(req.body.customerOrganization, 200);
    if (!customerOrganization) {
      return res.status(400).json({ message: "Байгууллагын нэр шаардлагатай" });
    }
    const pin =
      req.body?.pin === undefined ? null : String(req.body.pin).trim();
    if (pin !== null && !isValidRestaurantMealContractPin(pin)) {
      return res.status(400).json({ message: "PIN яг 4 оронтой тоо байна" });
    }
    const updated = await prisma.restaurantMealContract.update({
      where: { id: current.id },
      data: {
        customerOrganization,
        customerRegisterNo:
          req.body?.customerRegisterNo === undefined
            ? current.customerRegisterNo
            : normalizeText(req.body.customerRegisterNo, 20) || null,
        startDate,
        endDate,
        status: requestedStatus as RestaurantMealContractStatus,
        note:
          req.body?.note === undefined
            ? current.note
            : normalizeText(req.body.note, 500) || null,
        ...(pin ? { pinHash: await bcrypt.hash(pin, 10) } : {}),
      },
      include: contractInclude,
    });
    return res.json(mapContract(updated));
  } catch (error) {
    const known = error as KnownError;
    if (known.status)
      return res.status(known.status).json({ message: known.message });
    console.error("update restaurant meal contract error", error);
    return res
      .status(500)
      .json({ message: "Гэрээт байгууллага шинэчлэхэд алдаа гарлаа" });
  }
});

router.post("/restaurant/contract-meals/verify", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;
    const contractId = String(req.body?.contractId || "").trim();
    const pin = String(req.body?.pin || "").trim();
    const branchId = String(req.body?.branchId || "").trim();
    const { contract } = await authenticateContract({
      actor,
      branchId,
      contractId,
      pin,
    });
    return res.json({
      contract: {
        id: contract.id,
        customerOrganization: contract.customerOrganization,
        endDate: dateOnlyKey(contract.endDate),
      },
    });
  } catch (error) {
    const known = error as KnownError;
    if (known.status)
      return res.status(known.status).json({ message: known.message });
    console.error("verify restaurant meal contract error", error);
    return res
      .status(500)
      .json({ message: "Гэрээт байгууллагын PIN шалгахад алдаа гарлаа" });
  }
});

const checkoutInclude = {
  contract: { select: { customerOrganization: true } },
  restaurantTicket: { select: { ticketNo: true } },
} satisfies Prisma.RestaurantMealChargeInclude;

type CheckoutCharge = Prisma.RestaurantMealChargeGetPayload<{
  include: typeof checkoutInclude;
}>;

const mapCheckoutCharge = (charge: CheckoutCharge) => ({
  id: charge.id,
  ticketId: charge.restaurantTicketId,
  ticketNo: charge.restaurantTicket.ticketNo,
  amount: Number(charge.amount),
  packagingFee: Number(charge.packagingFee),
  orderedAt: charge.orderedAt.toISOString(),
  companyName: charge.companyNameSnapshot,
});

router.post("/restaurant/contract-meals/checkout", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;
    const branchId = String(req.body?.branchId || "").trim();
    const shiftId = String(req.body?.shiftId || "").trim();
    const ticketId = String(req.body?.ticketId || "").trim();
    const clientRequestId =
      normalizeText(req.body?.clientRequestId, 120) || null;
    const contractId = String(req.body?.contractId || "").trim();
    const pin = String(req.body?.pin || "").trim();
    if (!branchId || !shiftId || !ticketId) {
      return res
        .status(400)
        .json({ message: "branchId, shiftId болон ticketId шаардлагатай" });
    }

    const authenticated = await authenticateContract({
      actor,
      branchId,
      contractId,
      pin,
    });

    if (clientRequestId) {
      const existing = await prisma.restaurantMealCharge.findUnique({
        where: { clientRequestId },
        include: checkoutInclude,
      });
      if (existing) {
        if (
          existing.organizationId !== authenticated.branch.organizationId ||
          existing.contractId !== authenticated.contract.id
        ) {
          return res.status(409).json({
            message: "clientRequestId өөр захиалгад ашиглагдсан байна",
          });
        }
        return res.json(mapCheckoutCharge(existing));
      }
    }

    const charge = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`
          SELECT "id" FROM "RestaurantMealContract"
          WHERE "id" = ${authenticated.contract.id} FOR UPDATE
        `;
        await tx.$queryRaw`
          SELECT "id" FROM "RestaurantTicket"
          WHERE "id" = ${ticketId} FOR UPDATE
        `;

        const existing = await tx.restaurantMealCharge.findUnique({
          where: { restaurantTicketId: ticketId },
          include: checkoutInclude,
        });
        if (existing) {
          if (
            existing.organizationId !== authenticated.branch.organizationId ||
            existing.contractId !== authenticated.contract.id
          ) {
            throw knownError(
              409,
              "Энэ ticket өөр гэрээт байгууллагад бүртгэгдсэн байна",
            );
          }
          return existing;
        }

        const [contract, shift, ticket] = await Promise.all([
          tx.restaurantMealContract.findUnique({
            where: { id: authenticated.contract.id },
          }),
          tx.posShift.findUnique({
            where: { id: shiftId },
            select: {
              id: true,
              status: true,
              organizationId: true,
              branchId: true,
              cashierId: true,
              mode: true,
            },
          }),
          tx.restaurantTicket.findUnique({
            where: { id: ticketId },
            include: {
              items: {
                include: {
                  product: {
                    select: {
                      id: true,
                      stock: true,
                      isRestaurantMenuItem: true,
                    },
                  },
                },
              },
            },
          }),
        ]);

        if (!contract || !isRestaurantMealContractActive(contract)) {
          throw knownError(
            403,
            "Гэрээт байгууллагын эрх идэвхгүй болсон байна",
          );
        }
        if (
          !contract.pinHash ||
          !(await bcrypt.compare(pin, contract.pinHash))
        ) {
          throw knownError(403, "Байгууллагын PIN өөрчлөгдсөн байна");
        }
        if (
          !shift ||
          shift.status !== ShiftStatus.OPEN ||
          shift.mode !== PosRegisterMode.SELF_SERVICE ||
          shift.organizationId !== authenticated.branch.organizationId ||
          shift.branchId !== branchId ||
          shift.cashierId !== actor.id
        ) {
          throw knownError(409, "Киоскийн кассын ээлж нээлттэй биш байна");
        }
        if (!ticket) throw knownError(404, "Захиалгын ticket олдсонгүй");
        if (
          ticket.organizationId !== authenticated.branch.organizationId ||
          ticket.branchId !== branchId ||
          ticket.shiftId !== shiftId ||
          ticket.openedById !== actor.id ||
          ticket.tableId !== null
        ) {
          throw knownError(
            403,
            "Захиалгын ticket киоск эсвэл салбартай зөрүүтэй байна",
          );
        }
        if (
          !EDITABLE_TICKET_STATUSES.includes(ticket.status) ||
          ticket.posSaleId
        ) {
          throw knownError(409, "Захиалга аль хэдийн хаагдсан байна");
        }
        if (ticket.items.length === 0) {
          throw knownError(400, "Захиалгад хоол байхгүй байна");
        }

        const packagingFee =
          ticket.orderMode === RestaurantOrderMode.TO_GO
            ? SELF_SERVICE_TAKEAWAY_PACKAGING_FEE
            : 0;
        const amount = roundMoney(
          ticket.items.reduce(
            (sum, item) => sum + Number(item.unitPrice) * item.qty,
            0,
          ) + packagingFee,
        );
        if (amount <= 0) throw knownError(400, "Захиалгын дүн буруу байна");

        const unsentItems = ticket.items
          .map((item) => ({ item, qty: item.qty - item.sentQty }))
          .filter(({ qty }) => qty > 0);
        if (unsentItems.length === 0) {
          throw knownError(409, "Гал тогоо руу илгээх шинэ хоол байхгүй байна");
        }

        const chargeId = crypto.randomUUID();
        for (const { item, qty } of unsentItems) {
          if (item.product.isRestaurantMenuItem) continue;
          if (item.product.stock < qty) {
            throw knownError(
              409,
              `“${item.productName}” барааны үлдэгдэл хүрэлцэхгүй (${item.product.stock})`,
            );
          }
          const warehouseId = await resolveOrgWarehouse(
            tx,
            authenticated.branch.organizationId,
            item.productId,
          );
          await adjustStock(tx, {
            productId: item.productId,
            warehouseId: warehouseId ?? undefined,
            branchId,
            change: -qty,
            reason: InventoryReason.ORDER,
            note: `Гэрээт хоол · ${contract.customerOrganization}`,
            createdById: actor.id,
            referenceId: chargeId,
            referenceType: "POS_SALE",
          });
        }

        const itemsByStation = new Map<string, typeof unsentItems>();
        for (const unsentItem of unsentItems) {
          const station = unsentItem.item.kitchenStation || "HOT_KITCHEN";
          const stationItems = itemsByStation.get(station) || [];
          stationItems.push(unsentItem);
          itemsByStation.set(station, stationItems);
        }
        await Promise.all(
          [...itemsByStation.values()].map((stationItems) =>
            tx.kitchenTicket.create({
              data: {
                kitchenTicketNo: generateKitchenTicketNumber(),
                organizationId: ticket.organizationId,
                branchId: ticket.branchId,
                restaurantTicketId: ticket.id,
                sentById: actor.id,
                status: KitchenTicketStatus.NEW,
                items: {
                  create: stationItems.map(({ item, qty }) => ({
                    restaurantTicketItemId: item.id,
                    productId: item.productId,
                    productName: item.productName,
                    qty,
                    note: item.note,
                    kitchenStation: item.kitchenStation || "HOT_KITCHEN",
                    preparationMinutes: item.preparationMinutes,
                  })),
                },
              },
            }),
          ),
        );
        await Promise.all(
          unsentItems.map(({ item }) =>
            tx.restaurantTicketItem.update({
              where: { id: item.id },
              data: { sentQty: item.qty },
            }),
          ),
        );

        const created = await tx.restaurantMealCharge.create({
          data: {
            id: chargeId,
            organizationId: authenticated.branch.organizationId,
            contractId: contract.id,
            memberId: null,
            branchId,
            shiftId,
            cashierId: actor.id,
            restaurantTicketId: ticket.id,
            clientRequestId,
            companyNameSnapshot: contract.customerOrganization,
            employeeCodeSnapshot: null,
            employeeNameSnapshot: null,
            amount,
            packagingFee,
            note: normalizeText(req.body?.note, 500) || null,
          },
          include: checkoutInclude,
        });
        const now = new Date();
        await tx.restaurantTicket.update({
          where: { id: ticket.id },
          data: {
            status: RestaurantTicketStatus.CLOSED,
            sentAt: ticket.sentAt || now,
            closedAt: now,
          },
        });
        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return res.status(201).json(mapCheckoutCharge(charge));
  } catch (error) {
    const known = error as KnownError;
    if (known.status)
      return res.status(known.status).json({ message: known.message });
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res
        .status(409)
        .json({ message: "Энэ захиалга аль хэдийн бүртгэгдсэн байна" });
    }
    console.error("restaurant contract meal checkout error", error);
    return res
      .status(500)
      .json({ message: "Гэрээт хоолны захиалга бүртгэхэд алдаа гарлаа" });
  }
});

router.get("/restaurant/contract-meals/report", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;
    const organizationId = getRequestedOrganizationId(
      actor,
      req.query.organizationId,
    );
    const nowKey = ulaanbaatarDateKey();
    const defaultFrom = `${nowKey.slice(0, 7)}-01`;
    const fromDate = parseDateOnly(req.query.from || defaultFrom);
    const toDate = parseDateOnly(req.query.to || nowKey);
    if (!fromDate || !toDate || toDate < fromDate) {
      return res
        .status(400)
        .json({ message: "Тайлангийн огнооны интервал буруу байна" });
    }
    const fromInclusive = new Date(fromDate.getTime() - ULAANBAATAR_OFFSET_MS);
    const toExclusive = new Date(
      toDate.getTime() + 24 * 60 * 60 * 1000 - ULAANBAATAR_OFFSET_MS,
    );
    const contractId = String(req.query.contractId || "").trim();
    if (contractId) {
      const contract = await getAccessibleContract(actor, contractId);
      if (contract.organizationId !== organizationId) {
        return res
          .status(403)
          .json({ message: "Гэрээ байгууллагатай зөрүүтэй байна" });
      }
    }

    const charges = await prisma.restaurantMealCharge.findMany({
      where: {
        organizationId,
        status: RestaurantMealChargeStatus.ACTIVE,
        orderedAt: { gte: fromInclusive, lt: toExclusive },
        ...(contractId ? { contractId } : {}),
      },
      orderBy: [{ orderedAt: "desc" }, { createdAt: "desc" }],
      include: {
        contract: {
          select: {
            customerOrganization: true,
            customerRegisterNo: true,
          },
        },
        branch: { select: { id: true, name: true } },
        restaurantTicket: {
          select: {
            ticketNo: true,
            orderMode: true,
            items: {
              select: {
                id: true,
                productId: true,
                productName: true,
                qty: true,
                unitPrice: true,
              },
            },
          },
        },
      },
    });

    const companyTotals = new Map<
      string,
      {
        contractId: string;
        companyName: string;
        registerNo: string | null;
        orderCount: number;
        total: number;
      }
    >();
    for (const charge of charges) {
      const amount = Number(charge.amount);
      const company = companyTotals.get(charge.contractId);
      if (company) {
        company.orderCount += 1;
        company.total = roundMoney(company.total + amount);
      } else {
        companyTotals.set(charge.contractId, {
          contractId: charge.contractId,
          companyName: charge.companyNameSnapshot,
          registerNo: charge.contract.customerRegisterNo,
          orderCount: 1,
          total: amount,
        });
      }
    }

    return res.json({
      from: dateOnlyKey(fromDate),
      to: dateOnlyKey(toDate),
      orderCount: charges.length,
      total: roundMoney(
        charges.reduce((sum, charge) => sum + Number(charge.amount), 0),
      ),
      companies: [...companyTotals.values()].sort((a, b) =>
        a.companyName.localeCompare(b.companyName, "mn"),
      ),
      charges: charges.map((charge) => ({
        id: charge.id,
        contractId: charge.contractId,
        companyName: charge.companyNameSnapshot,
        registerNo: charge.contract.customerRegisterNo,
        branchId: charge.branch.id,
        branchName: charge.branch.name,
        ticketNo: charge.restaurantTicket.ticketNo,
        orderMode: charge.restaurantTicket.orderMode,
        amount: Number(charge.amount),
        packagingFee: Number(charge.packagingFee),
        orderedAt: charge.orderedAt.toISOString(),
        note: charge.note,
        items: charge.restaurantTicket.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          qty: item.qty,
          unitPrice: Number(item.unitPrice),
          lineTotal: roundMoney(Number(item.unitPrice) * item.qty),
        })),
      })),
    });
  } catch (error) {
    const known = error as KnownError;
    if (known.status)
      return res.status(known.status).json({ message: known.message });
    console.error("restaurant contract meal report error", error);
    return res
      .status(500)
      .json({ message: "Гэрээт хоолны тайлан авахад алдаа гарлаа" });
  }
});

export default router;
