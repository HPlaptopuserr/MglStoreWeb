import type { EsimPurchase, Prisma, PrismaClient } from "@prisma/client";
export type Purchase = EsimPurchase;
export type PurchasePatch = Prisma.EsimPurchaseUpdateManyMutationInput;
export interface PurchaseStore {
  get(id: string): Promise<Purchase | null>;
  existing(
    userId: string,
    key: string,
    quoteHash: string,
  ): Promise<Purchase | null>;
  create(data: Prisma.EsimPurchaseUncheckedCreateInput): Promise<Purchase>;
  list(userId: string): Promise<Purchase[]>;
  due(now: Date): Promise<Purchase[]>;
  claim(id: string, token: string, now: Date): Promise<boolean>;
  update(id: string, token: string, data: PurchasePatch): Promise<boolean>;
}
export class PrismaPurchaseStore implements PurchaseStore {
  constructor(private readonly db: PrismaClient) {}
  get(id: string) {
    return this.db.esimPurchase.findUnique({ where: { id } });
  }
  existing(userId: string, key: string, quoteHash: string) {
    return this.db.esimPurchase.findFirst({
      where: { userId, OR: [{ idempotencyKey: key }, { quoteHash }] },
    });
  }
  create(data: Prisma.EsimPurchaseUncheckedCreateInput) {
    return this.db.esimPurchase.create({ data });
  }
  list(userId: string) {
    return this.db.esimPurchase.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
  due(now: Date) {
    return this.db.esimPurchase.findMany({
      where: {
        status: {
          in: ["CREATING_INVOICE", "AWAITING_PAYMENT", "PAID", "PROVISIONING"],
        },
        nextAttemptAt: { lte: now },
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
      },
      orderBy: { nextAttemptAt: "asc" },
      take: 10,
    });
  }
  async claim(id: string, token: string, now: Date) {
    const result = await this.db.esimPurchase.updateMany({
      where: {
        id,
        nextAttemptAt: { lte: now },
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
      },
      data: { leaseToken: token, leaseUntil: new Date(now.getTime() + 120000) },
    });
    return result.count === 1;
  }
  async update(id: string, token: string, data: PurchasePatch) {
    const result = await this.db.esimPurchase.updateMany({
      where: { id, leaseToken: token },
      data,
    });
    return result.count === 1;
  }
}
