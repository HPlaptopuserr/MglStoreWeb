import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { EsimPaymentInvoice } from "./minu-payment";
import type { EsimCatalogService } from "./catalog-service";
import { AccessRejected, type EsimFulfillment } from "./access-fulfillment";
import type { ActivationVault } from "./activation-vault";
import type { PricingPolicy } from "./pricing";
import { checkoutPrice } from "./member-pricing";
import type { EsimQuoteService } from "./quote-service";
import type { Purchase, PurchaseStore } from "./purchase-store";

export class PurchaseError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
export interface PurchaseInput {
  token: string;
  idempotencyKey: string;
  acceptedTerms: true;
  compatibleDevice: true;
}
export interface PurchaseDependencies {
  store: PurchaseStore;
  catalog: EsimCatalogService;
  quotes: () => EsimQuoteService;
  pricing: () => PricingPolicy;
  enabled: () => boolean;
  terms: () => string;
  member: (userId: string) => Promise<boolean>;
  supplier: () => EsimFulfillment;
  vault: () => ActivationVault;
  merchantCode: () => string;
  createInvoice: (order: Purchase) => Promise<EsimPaymentInvoice>;
  checkPayment: (order: Purchase) => Promise<boolean>;
  now?: () => number;
}
export class EsimPurchaseService {
  private readonly now: () => number;
  constructor(private readonly deps: PurchaseDependencies) {
    this.now = deps.now ?? Date.now;
  }

  async create(userId: string, input: PurchaseInput): Promise<Purchase> {
    const hash = createHash("sha256").update(input.token).digest("hex");
    // Retries must recover an existing order even after its quote has expired.
    const existing = await this.deps.store.existing(
      userId,
      input.idempotencyKey,
      hash,
    );
    if (existing) {
      if (existing.quoteHash !== hash)
        throw new PurchaseError(
          409,
          "ESIM_KEY_REUSED",
          "Захиалгын хүсэлт өөрчлөгдсөн байна.",
        );
      return existing;
    }
    if (!this.deps.enabled())
      throw new PurchaseError(
        503,
        "ESIM_CHECKOUT_DISABLED",
        "Худалдан авалт түр боломжгүй байна.",
      );
    let quote: ReturnType<EsimQuoteService["verify"]>;
    try {
      quote = this.deps.quotes().verify(input.token, userId, this.now());
    } catch {
      throw new PurchaseError(
        409,
        "ESIM_QUOTE_EXPIRED",
        "Үнийн саналыг шинэчилнэ үү.",
      );
    }
    if (quote.memberPrice && !(await this.deps.member(userId)))
      throw new PurchaseError(
        403,
        "ESIM_MEMBERSHIP_REQUIRED",
        "Хүчинтэй гишүүнчлэл шаардлагатай.",
      );
    if (!quote.terms || quote.terms !== this.deps.terms())
      throw new PurchaseError(
        409,
        "ESIM_TERMS_CHANGED",
        "Худалдан авах нөхцөлийг дахин шалгана уу.",
      );
    const catalog = await this.deps.catalog.list(quote.country);
    const offer = catalog.offers.find(
      (offer) => offer.id === quote.offerId && offer.supplier === "esim-access",
    );
    if (
      !offer ||
      checkoutPrice(
        offer.wholesaleUsdUnits,
        this.deps.pricing(),
        quote.memberPrice,
        this.now(),
      ) !== quote.totalMnt
    )
      throw new PurchaseError(
        409,
        "ESIM_PRICE_CHANGED",
        "Багцын үнэ өөрчлөгдсөн байна. Шинэчилнэ үү.",
      );
    if (quote.totalMnt > 2147483647 || offer.wholesaleUsdUnits > 2147483647)
      throw new PurchaseError(
        503,
        "ESIM_NOT_READY",
        "Багц түр боломжгүй байна.",
      );
    if ((await this.deps.supplier().balance()) < offer.wholesaleUsdUnits)
      throw new PurchaseError(
        503,
        "ESIM_NOT_READY",
        "Багцын борлуулалт түр боломжгүй байна.",
      );
    const id = randomUUID();
    const leaseToken = randomUUID();
    let order: Purchase;
    try {
      order = await this.deps.store.create({
        id,
        userId,
        idempotencyKey: input.idempotencyKey,
        quoteHash: hash,
        merchantCode: this.deps.merchantCode(),
        memberPrice: quote.memberPrice,
        offerId: offer.id,
        packageId: offer.packageId,
        title: offer.title,
        country: quote.country,
        dataMb: offer.dataMb,
        days: offer.days,
        totalMnt: quote.totalMnt,
        wholesaleUsdUnits: offer.wholesaleUsdUnits,
        terms: quote.terms,
        status: "CREATING_INVOICE",
        leaseToken,
        leaseUntil: new Date(this.now() + 120000),
        nextAttemptAt: new Date(this.now() + 120000),
      });
    } catch (error) {
      const recovered = await this.deps.store.existing(
        userId,
        input.idempotencyKey,
        hash,
      );
      if (recovered && recovered.quoteHash === hash) return recovered;
      throw error;
    }
    try {
      const invoice = await this.deps.createInvoice(order);
      if (!invoice.invoice_id || !invoice.qr_text)
        throw new Error("Invalid invoice");
      await this.deps.store.update(id, leaseToken, {
        invoiceId: invoice.invoice_id,
        invoice: JSON.parse(JSON.stringify(invoice)) as Prisma.InputJsonObject,
        status: "AWAITING_PAYMENT",
        leaseToken: null,
        leaseUntil: null,
        nextAttemptAt: new Date(this.now() + 15000),
      });
    } catch {
      // Provider may have created the invoice; never blindly create another.
      await this.deps.store.update(id, leaseToken, {
        status: "PAYMENT_REVIEW",
        errorCode: "INVOICE_UNCERTAIN",
        leaseToken: null,
        leaseUntil: null,
      });
    }
    return (await this.deps.store.get(id))!;
  }

  async owned(userId: string, id: string): Promise<Purchase> {
    const order = await this.deps.store.get(id);
    if (!order || order.userId !== userId)
      throw new PurchaseError(404, "ESIM_NOT_FOUND", "Захиалга олдсонгүй.");
    return order;
  }
  list(userId: string) {
    return this.deps.store.list(userId);
  }
  async activation(userId: string, id: string): Promise<unknown> {
    const order = await this.owned(userId, id);
    if (order.status !== "READY" || !order.activationEncrypted)
      throw new PurchaseError(409, "ESIM_NOT_ISSUED", "eSIM бэлтгэгдэж байна.");
    return JSON.parse(
      this.deps.vault().open(id, order.activationEncrypted),
    ) as unknown;
  }

  async reconcile(id: string): Promise<void> {
    const token = randomUUID();
    if (!(await this.deps.store.claim(id, token, new Date(this.now())))) return;
    let order = await this.deps.store.get(id);
    if (!order) return;
    try {
      if (order.status === "CREATING_INVOICE") {
        await this.deps.store.update(id, token, {
          status: "PAYMENT_REVIEW",
          errorCode: "INVOICE_UNCERTAIN",
        });
        return;
      }
      if (order.status === "AWAITING_PAYMENT" && order.invoiceId) {
        const paid = await this.deps.checkPayment(order);
        if (!paid) return;
        const paymentId = `MINU:${order.merchantCode}:${order.invoiceId}`;
        if (
          !(await this.deps.store.update(id, token, {
            status: "PAID",
            paymentId,
            paidAt: new Date(this.now()),
            errorCode: null,
          }))
        )
          return;
        order = (await this.deps.store.get(id))!;
      }
      if (order.status !== "PAID" && order.status !== "PROVISIONING") return;
      const vault = this.deps.vault();
      const supplier = this.deps.supplier();
      // Durable id + pinned supplier/package/price. Timeout retries reuse the same transaction.
      if (!order.supplierOrderNo) {
        if (
          !(await this.deps.store.update(id, token, { status: "PROVISIONING" }))
        )
          return;
        const orderNo = await supplier.order(
          id,
          order.packageId,
          order.wholesaleUsdUnits,
        );
        if (
          !(await this.deps.store.update(id, token, {
            supplierOrderNo: orderNo,
          }))
        )
          return;
        order = (await this.deps.store.get(id))!;
      }
      const profile = await supplier.profile(order.supplierOrderNo!);
      if (!profile) return;
      if (
        ["CANCEL", "REVOKE", "UNUSED_EXPIRED", "USED_EXPIRED"].includes(
          profile.supplierStatus,
        )
      ) {
        await this.deps.store.update(id, token, {
          status: "FULFILLMENT_REVIEW",
          errorCode: "PROFILE_UNAVAILABLE",
        });
        return;
      }
      await this.deps.store.update(id, token, {
        status: "READY",
        supplierStatus: profile.supplierStatus,
        fulfilledAt: new Date(this.now()),
        activationEncrypted: vault.seal(id, JSON.stringify(profile)),
        errorCode: null,
      });
    } catch (error) {
      // A rejected paid order needs operator reconciliation/refund, never another supplier.
      if (
        error instanceof AccessRejected &&
        [
          "200005",
          "200006",
          "200007",
          "200008",
          "200011",
          "310241",
          "310243",
        ].includes(error.code)
      ) {
        await this.deps.store.update(id, token, {
          status: "FULFILLMENT_REVIEW",
          errorCode: `SUPPLIER_${error.code}`,
        });
      } else {
        await this.deps.store.update(id, token, {
          errorCode: "RECONCILIATION_PENDING",
        });
      }
    } finally {
      const delay =
        order.status === "AWAITING_PAYMENT"
          ? this.now() - order.createdAt.getTime() > 86400000
            ? 3600000
            : 30000
          : Math.min(300000, 15000 * 2 ** Math.min(order.attempts, 5));
      await this.deps.store.update(id, token, {
        leaseToken: null,
        leaseUntil: null,
        attempts: { increment: 1 },
        nextAttemptAt: new Date(this.now() + delay),
      });
    }
  }
  async tick(): Promise<void> {
    for (const order of await this.deps.store.due(new Date(this.now())))
      await this.reconcile(order.id);
  }
}

/** No costs, activation secrets or internal provider errors in ordinary responses. */
export function publicPurchase(order: Purchase) {
  return {
    id: order.id,
    title: order.title,
    dataMb: order.dataMb,
    days: order.days,
    totalMnt: order.totalMnt,
    currency: "MNT",
    memberPrice: order.memberPrice,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    terms: order.terms,
    invoice: order.status === "AWAITING_PAYMENT" ? order.invoice : null,
  };
}
