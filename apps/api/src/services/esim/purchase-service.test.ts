import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { ActivationVault } from "./activation-vault";
import { AccessFulfillment } from "./access-fulfillment";
import {
  EsimPurchaseService,
  PurchaseError,
  publicPurchase,
} from "./purchase-service";
import { EsimCatalogService } from "./catalog-service";
import { EsimQuoteService } from "./quote-service";
import type { Purchase, PurchasePatch, PurchaseStore } from "./purchase-store";
import { memberEligible, checkoutPrice } from "./member-pricing";
import type { PricingPolicy } from "./pricing";
import { parsePurchaseInput } from "../../routes/esim/purchase.routes";

class MemoryStore implements PurchaseStore {
  rows = new Map<string, Purchase>();
  async get(id: string) {
    return this.rows.get(id) ?? null;
  }
  async existing(user: string, key: string, hash: string) {
    return (
      [...this.rows.values()].find(
        (o) =>
          o.userId === user &&
          (o.idempotencyKey === key || o.quoteHash === hash),
      ) ?? null
    );
  }
  async create(data: Prisma.EsimPurchaseUncheckedCreateInput) {
    if (await this.existing(data.userId, data.idempotencyKey, data.quoteHash))
      throw new Error("Unique");
    const row = {
      invoice: null,
      invoiceId: null,
      supplierOrderNo: null,
      paymentId: null,
      activationEncrypted: null,
      supplierStatus: null,
      errorCode: null,
      paidAt: null,
      fulfilledAt: null,
      attempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    } as Purchase;
    this.rows.set(row.id, row);
    return row;
  }
  async list(user: string) {
    return [...this.rows.values()].filter((o) => o.userId === user);
  }
  async due(now: Date) {
    return [...this.rows.values()].filter((o) => o.nextAttemptAt <= now);
  }
  async claim(id: string, token: string, now: Date) {
    const row = this.rows.get(id);
    if (
      !row ||
      row.nextAttemptAt > now ||
      (row.leaseUntil && row.leaseUntil >= now)
    )
      return false;
    this.rows.set(id, {
      ...row,
      leaseToken: token,
      leaseUntil: new Date(+now + 120000),
    });
    return true;
  }
  async update(id: string, token: string, patch: PurchasePatch) {
    const row = this.rows.get(id);
    if (!row || row.leaseToken !== token) return false;
    const { attempts, ...fields } = patch;
    const updated = {
      ...row,
      ...fields,
      attempts:
        row.attempts +
        (typeof attempts === "object" ? (attempts.increment ?? 0) : 0),
    } as Purchase;
    this.rows.set(id, updated);
    return true;
  }
}
function fixture() {
  let now = Date.now();
  let paid = false;
  let member = false;
  let orderCalls = 0;
  let timeout = false;
  let invoiceCalls = 0;
  const store = new MemoryStore();
  const catalog = new EsimCatalogService([
    {
      id: "esim-access",
      fetchPage: async () => ({
        supplier: "esim-access",
        nextPage: null,
        records: [
          {
            slug: "CN_1_7",
            name: "China",
            location: "CN",
            durationUnit: "DAY",
            duration: 7,
            volume: 1073741824,
            dataType: 1,
            currencyCode: "USD",
            price: 7000,
            activeType: 2,
          },
        ],
      }),
    },
  ]);
  const policy: PricingPolicy = {
    usdMnt: 3500,
    fxAt: now,
    vatBps: 0,
    incomeTaxReserveBps: 0,
    qrFeeBps: 100,
    fundingFeeBps: 0,
    refundReserveBps: 0,
    additionalSupplierTaxBps: 0,
    overheadPerOrderMnt: 0,
    profitMarkupBps: 3000,
    roundingMnt: 100,
  };
  const quotes = new EsimQuoteService("x".repeat(32));
  const vault = new ActivationVault(randomBytes(32).toString("base64"));
  const ids: string[] = [];

  const service = new EsimPurchaseService({
    store,
    catalog,
    quotes: () => quotes,
    pricing: () => policy,
    enabled: () => true,
    terms: () => "Reviewed terms",
    member: async () => member,
    now: () => now,
    vault: () => vault,
    supplier: () => ({
      balance: async () => 1000000,
      order: async (id) => {
        orderCalls++;
        ids.push(id);
        if (timeout) {
          timeout = false;
          throw new Error("timeout");
        }
        return "supplier-order";
      },
      profile: async () => ({
        activationCode: "LPA:1$example.com$secret",
        iccid: "12345",
        esimTranNo: "profile-id",
        supplierStatus: "GOT_RESOURCE",
        installationStatus: "RELEASED",
      }),
    }),
    merchantCode: () => "mgl-esim-merchant",
    createInvoice: async (order) => {
      invoiceCalls++;
      return {
        invoice_id: "invoice",
        qr_text: "payment-code",
        qr_image: "",
        urls: [],
      };
    },
    checkPayment: async () => paid,
  });
  return {
    store,
    service,
    ids,
    policy,
    pay: () => {
      paid = true;
    },
    timeout: () => {
      timeout = true;
    },
    member: (value: boolean) => {
      member = value;
    },
    advance: () => {
      now += 360000;
    },
    calls: () => ({ orderCalls, invoiceCalls }),
    input: async (memberPrice = false) => {
      const offer = (await catalog.list("CN")).offers[0]!;
      const quote = quotes.issue("owner", offer, policy, now, {
        memberPrice,
        terms: "Reviewed terms",
        checkoutAvailable: true,
      });
      return {
        token: quote.token,
        idempotencyKey: "test-order-key-0001",
        acceptedTerms: true as const,
        compatibleDevice: true as const,
      };
    },
  };
}

test("durable idempotency, payment verification, owner isolation and encrypted activation", async () => {
  const f = fixture();
  const input = await f.input();
  const order = await f.service.create("owner", input);
  assert.equal(order.status, "AWAITING_PAYMENT");
  assert.equal((await f.service.create("owner", input)).id, order.id);
  assert.equal(f.calls().invoiceCalls, 1);
  f.advance();
  await f.service.reconcile(order.id);
  assert.equal(f.calls().orderCalls, 0);
  f.pay();
  f.advance();
  await Promise.all([
    f.service.reconcile(order.id),
    f.service.reconcile(order.id),
  ]);
  const ready = await f.service.owned("owner", order.id);
  assert.equal(ready.status, "READY");
  assert.equal(f.calls().orderCalls, 1);
  assert.ok(!ready.activationEncrypted!.includes("secret"));
  assert.ok(!JSON.stringify(publicPurchase(ready)).includes("activation"));
  await assert.rejects(
    f.service.activation("attacker", order.id),
    (e: unknown) => e instanceof PurchaseError && e.status === 404,
  );
  assert.match(
    JSON.stringify(await f.service.activation("owner", order.id)),
    /LPA:1/,
  );
});

test("ambiguous supplier request reuses the original transaction after restart/retry", async () => {
  const f = fixture();
  const order = await f.service.create("owner", await f.input());
  f.pay();
  f.timeout();
  f.advance();
  await f.service.reconcile(order.id);
  assert.equal(
    (await f.service.owned("owner", order.id)).status,
    "PROVISIONING",
  );
  f.advance();
  await f.service.reconcile(order.id);
  assert.deepEqual(f.ids, [order.id, order.id]);
  assert.equal((await f.service.owned("owner", order.id)).status, "READY");
});

test("at-cost toggle is user-bound and membership is rechecked before invoice", async () => {
  const f = fixture();
  const input = await f.input(true);
  await assert.rejects(
    f.service.create("owner", input),
    (e: unknown) => e instanceof PurchaseError && e.status === 403,
  );
  assert.equal(f.calls().invoiceCalls, 0);
  f.member(true);
  const order = await f.service.create("owner", input);
  assert.equal(order.memberPrice, true);
  assert.equal(order.totalMnt, 2500);
  assert.ok(order.totalMnt < checkoutPrice(7000, f.policy, false));
  assert.equal(
    memberEligible({ isPrime: true, membershipExpiresAt: new Date(0) }),
    false,
  );
});

test("vault rejects swapped and tampered ciphertext", () => {
  const vault = new ActivationVault(randomBytes(32).toString("base64"));
  const sealed = vault.seal("one", "private");
  assert.equal(vault.open("one", sealed), "private");
  assert.throws(() => vault.open("two", sealed));
  assert.throws(() => vault.open("one", sealed.slice(0, -5)));
});

test("order contract rejects client price injection and missing consent", () => {
  const input = {
    token: "quote",
    idempotencyKey: "test-order-key-0001",
    acceptedTerms: true,
    compatibleDevice: true,
  };
  assert.ok(parsePurchaseInput(input));
  assert.equal(parsePurchaseInput({ ...input, totalMnt: 1 }), null);
  assert.equal(parsePurchaseInput({ ...input, acceptedTerms: false }), null);
});

test("Access adapter pins transaction, amount and profile ownership without live calls", async () => {
  const requests: unknown[] = [];
  const adapter = new AccessFulfillment("test", async (url, init) => {
    requests.push(JSON.parse(String(init?.body)) as unknown);
    const data = String(url).endsWith("/order")
      ? { orderNo: "o1" }
      : { esimList: [{ orderNo: "wrong" }] };
    return new Response(JSON.stringify({ success: true, obj: data }), {
      status: 200,
    });
  });
  assert.equal(await adapter.order("stable-id", "CN_1_7", 7000), "o1");
  assert.deepEqual(requests[0], {
    transactionId: "stable-id",
    amount: 7000,
    packageInfoList: [{ slug: "CN_1_7", count: 1, price: 7000 }],
  });
  await assert.rejects(adapter.profile("o1"), /ownership/);
});
