import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createHash } from "node:crypto";
import { prisma, Prisma } from "@mgl/database";
import {
  clubGoldExpiresAt,
  clubGoldTokenMatches,
  checkClubGoldInvoice,
  CLUB_GOLD_PRICE,
  createClubGoldInvoice,
} from "./mgl-club-gold";
const restores: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restores.push(() => {
    Reflect.set(target, key, previous);
  });
}
afterEach(() => {
  while (restores.length) restores.pop()?.();
});
test("six-month membership clamps month-end dates", () => {
  assert.equal(
    clubGoldExpiresAt(new Date("2026-08-31T12:00:00Z")).toISOString(),
    "2027-02-28T12:00:00.000Z",
  );
  assert.equal(
    clubGoldExpiresAt(new Date("2026-11-15T12:00:00Z")).toISOString(),
    "2027-05-15T12:00:00.000Z",
  );
});
test("payment capabilities cannot be guessed, malformed or taken from public profile fields", () => {
  const token = "a".repeat(64);
  const hash = createHash("sha256").update(token).digest("hex");
  assert.equal(clubGoldTokenMatches(token, hash), true);
  assert.equal(clubGoldTokenMatches("b".repeat(64), hash), false);
  assert.equal(clubGoldTokenMatches("short", hash), false);
  assert.equal(clubGoldTokenMatches(token, null), false);
});
test("wrong-purpose and wrong-price invoices cannot activate gold", async () => {
  for (const invoice of [
    null,
    { amount: 1200000, webhookPayload: { kind: "ESIM" } },
    { amount: 1, webhookPayload: { kind: "MGL_CLUB_GOLD" } },
  ]) {
    stub(prisma.qPayInvoice, "findFirst", async () => invoice);
    await assert.rejects(
      checkClubGoldInvoice("invoice"),
      /Нэхэмжлэх олдсонгүй/,
    );
  }
});
test("verified provider settlement is idempotent and uses the stored eSIM merchant invoice", async () => {
  const env = { ...process.env };
  restores.push(() => {
    process.env = env;
  });
  Object.assign(process.env, {
    SYSTEMQR_USERNAME: "club-gold-test",
    SYSTEMQR_PASSWORD: "test",
    ESIM_MINU_MERCHANT_CODE: "esim-current",
  });
  let paid = false;
  const payload = {
    kind: "MGL_CLUB_GOLD",
    merchantCode: "esim-at-creation",
    username: "club-gold-test",
    providerInvoiceId: "provider-invoice",
  };
  let invoice = {
    id: "invoice",
    status: "PENDING",
    amount: new Prisma.Decimal(CLUB_GOLD_PRICE),
    expiresAt: new Date(0),
    webhookPayload: payload as Prisma.JsonObject,
  };
  stub(prisma.qPayInvoice, "findFirst", async () => invoice);
  stub(prisma.qPayInvoice, "findUniqueOrThrow", async () => invoice);
  let settlements = 0;
  stub(
    prisma.qPayInvoice,
    "updateMany",
    async (args: {
      where: { status: string };
      data: { status: string; webhookPayload: Prisma.JsonObject };
    }) => {
      assert.equal(args.where.status, "PENDING");
      settlements++;
      invoice = {
        ...invoice,
        status: args.data.status,
        webhookPayload: args.data.webhookPayload,
      };
      return { count: 1 };
    },
  );
  const original = globalThis.fetch;
  restores.push(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/login"))
      return Response.json({ status: "000", entity: "test-token" });
    assert.ok(url.endsWith("/checkInvoice"));
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    assert.equal(body.merchantCode, "esim-at-creation");
    assert.equal(body.invoiceNumber, "provider-invoice");
    return Response.json({
      status: "000",
      entity: { status: paid ? "000" : null },
    });
  };
  assert.equal((await checkClubGoldInvoice("invoice")).status, "EXPIRED");
  assert.equal(settlements, 0);
  paid = true;
  const settled = await checkClubGoldInvoice("invoice");
  assert.equal(settled.status, "PAID");
  assert.ok(typeof settled.accessExpiresAt === "string");
  assert.deepEqual(await checkClubGoldInvoice("invoice"), settled);
  assert.equal(settlements, 1);
});
test("invalid capability stops invoice creation before contacting the provider", async () => {
  stub(prisma.formResponse, "findFirst", async () => ({
    data: { paymentTokenHash: "a".repeat(64) },
  }));
  await assert.rejects(
    createClubGoldInvoice("registration", "wrong"),
    /Бүртгэлийн төлбөрийн холбоос/,
  );
});

test("invoice creation fixes the price and eSIM account on the server", async () => {
  const env = { ...process.env };
  restores.push(() => {
    process.env = env;
  });
  Object.assign(process.env, {
    SYSTEMQR_USERNAME: "club-create-test",
    SYSTEMQR_PASSWORD: "test",
    ESIM_MINU_MERCHANT_CODE: "esim-mgl-test",
    API_PUBLIC_URL: "https://api.example.com",
  });
  const token = "c".repeat(64);
  const data = {
    name: "Бат",
    businessName: "Компани",
    sector: "Худалдаа",
    city: "Улаанбаатар",
    description: "Танилцуулга",
    offers: "Бараа",
    phone: "99112233",
    consent: "yes",
    logoUrl:
      "/api/forms/mgl-club/logos/00000000-0000-4000-8000-000000000000.webp",
    paymentTokenHash: createHash("sha256").update(token).digest("hex"),
  };
  stub(prisma.formResponse, "findFirst", async () => ({ data }));
  const invoice = {
    id: "invoice",
    amount: new Prisma.Decimal(CLUB_GOLD_PRICE),
    qrText: "qr",
    expiresAt: new Date(),
    webhookPayload: { kind: "MGL_CLUB_GOLD" },
  };
  stub(prisma.qPayInvoice, "findFirst", async () => null);
  stub(prisma, "$transaction", async (run: (tx: object) => Promise<unknown>) =>
    run({
      $queryRaw: async () => [],
      qPayInvoice: {
        findFirst: async () => null,
        create: async (args: {
          data: { amount: number; webhookPayload: Prisma.JsonObject };
        }) => {
          assert.equal(args.data.amount, 1200000);
          assert.equal(args.data.webhookPayload.durationMonths, 6);
          assert.equal(args.data.webhookPayload.merchantCode, "esim-mgl-test");
          return invoice;
        },
      },
    }),
  );
  stub(prisma.qPayInvoice, "update", async () => invoice);
  const original = globalThis.fetch;
  restores.push(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = async (input, init) => {
    if (String(input).endsWith("/login"))
      return Response.json({ status: "000", entity: "test-token" });
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    assert.equal(body.amount, 1200000);
    assert.equal(body.merchantCode, "esim-mgl-test");
    assert.equal(
      body.webhook,
      "https://api.example.com/api/forms/mgl-club/gold/callback?invoiceId=invoice",
    );
    return Response.json({
      status: "000",
      entity: {
        invoiceNumber: "provider-created",
        mainQr: "qr-text",
        deeplinkList: [],
      },
    });
  };
  const result = await createClubGoldInvoice("registration", token);
  assert.equal(result.amount, 1200000);
  assert.equal("username" in result, false);
});
