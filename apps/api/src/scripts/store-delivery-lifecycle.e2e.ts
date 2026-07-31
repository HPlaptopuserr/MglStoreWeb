import fs from "fs/promises";
import path from "path";
import jwt from "jsonwebtoken";
import {
  Capability,
  DeliveryPartnershipStatus,
  OrgRole,
  OrgType,
  PlatformRole,
  prisma,
} from "@mgl/database";

const apiBaseUrl = process.env.E2E_API_URL || "http://127.0.0.1:4000";
const captureFile = process.env.EMAIL_CAPTURE_FILE?.trim();
const jwtSecret = process.env.JWT_SECRET || "dev-secret-change-me";
const runId = `e2e-${Date.now()}`;
const ids = {
  customer: `${runId}-customer`,
  vendor: `${runId}-vendor`,
  driver: `${runId}-driver`,
  vendorOrg: `${runId}-vendor-org`,
  deliveryOrg: `${runId}-delivery-org`,
  branch: `${runId}-branch`,
  product: `${runId}-product`,
  partnership: `${runId}-partnership`,
};
let orderId: string | null = null;
let proofImage: string | null = null;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function token(userId: string, organizationId?: string, orgRole?: OrgRole) {
  return jwt.sign(
    {
      userId,
      role: PlatformRole.USER,
      organizationId: organizationId ?? null,
      orgRole: orgRole ?? null,
    },
    jwtSecret,
    { expiresIn: "10m" },
  );
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
) {
  const headers = new Headers(options.headers);
  if (options.token) headers.set("authorization", `Bearer ${options.token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("content-type", "application/json");
  }
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${path} → ${response.status}: ${text}`);
  }
  return body as T;
}

async function seedFixture() {
  await prisma.user.createMany({
    data: [
      {
        id: ids.customer,
        email: `${runId}-customer@example.test`,
        role: PlatformRole.USER,
        isActive: true,
        emailVerified: true,
      },
      {
        id: ids.vendor,
        email: `${runId}-vendor@example.test`,
        role: PlatformRole.USER,
        isActive: true,
        emailVerified: true,
      },
      {
        id: ids.driver,
        email: `${runId}-driver@example.test`,
        role: PlatformRole.USER,
        isActive: true,
        emailVerified: true,
      },
    ],
  });
  await prisma.profile.createMany({
    data: [
      { userId: ids.customer, fullName: "E2E Customer", phoneNumber: "99001122" },
      { userId: ids.vendor, fullName: "E2E Vendor", phoneNumber: "99002233" },
      { userId: ids.driver, fullName: "E2E Driver", phoneNumber: "99003344" },
    ],
  });
  await prisma.organization.createMany({
    data: [
      {
        id: ids.vendorOrg,
        name: `E2E Vendor ${runId}`,
        slug: ids.vendorOrg,
        taxId: `${Date.now()}01`,
        type: OrgType.SUPPLIER,
        email: `${runId}-shop@example.test`,
        phone: "77112233",
        address: "E2E pickup address",
        businessOrdersEnabled: true,
      },
      {
        id: ids.deliveryOrg,
        name: `E2E Delivery ${runId}`,
        slug: ids.deliveryOrg,
        taxId: `${Date.now()}02`,
        type: OrgType.SUPPLIER,
        businessDeliveryEnabled: true,
      },
    ],
  });
  await prisma.organizationMember.createMany({
    data: [
      {
        userId: ids.vendor,
        organizationId: ids.vendorOrg,
        role: OrgRole.OWNER,
        isPrimary: true,
      },
      {
        userId: ids.driver,
        organizationId: ids.deliveryOrg,
        role: OrgRole.STAFF,
        isPrimary: true,
        capabilities: [Capability.DELIVERY_DRIVER],
      },
    ],
  });
  await prisma.branch.create({
    data: {
      id: ids.branch,
      organizationId: ids.vendorOrg,
      name: "E2E Pickup Branch",
      address: "E2E pickup address",
      lat: 47.918,
      lng: 106.917,
    },
  });
  await prisma.product.create({
    data: {
      id: ids.product,
      organizationId: ids.vendorOrg,
      name: "E2E Test Product",
      sku: `SKU-${runId}`,
      price: 25_000,
      stock: 10,
      isActive: true,
    },
  });
  await prisma.deliveryPartnership.create({
    data: {
      id: ids.partnership,
      requesterOrganizationId: ids.vendorOrg,
      providerOrganizationId: ids.deliveryOrg,
      status: DeliveryPartnershipStatus.ACCEPTED,
      requestedById: ids.vendor,
      respondedById: ids.driver,
      respondedAt: new Date(),
    },
  });
}

async function cleanup() {
  if (proofImage) {
    const fileName = proofImage.split("/").pop();
    if (fileName) {
      await fs
        .unlink(path.resolve(process.cwd(), "uploads/delivery-proofs", fileName))
        .catch(() => undefined);
    }
  }
  if (orderId) {
    await prisma.delivery.deleteMany({ where: { orderId } });
    await prisma.paymentAttempt.deleteMany({ where: { orderId } });
    await prisma.orderDispatchAttempt.deleteMany({ where: { orderId } });
    await prisma.orderHistory.deleteMany({ where: { orderId } });
    await prisma.orderItem.deleteMany({ where: { orderId } });
    await prisma.order.deleteMany({ where: { id: orderId } });
  }
  await prisma.deliveryPartnership.deleteMany({ where: { id: ids.partnership } });
  await prisma.inventoryLedger.deleteMany({ where: { productId: ids.product } });
  await prisma.product.deleteMany({ where: { id: ids.product } });
  await prisma.branch.deleteMany({ where: { id: ids.branch } });
  await prisma.organizationMember.deleteMany({
    where: { organizationId: { in: [ids.vendorOrg, ids.deliveryOrg] } },
  });
  await prisma.organization.deleteMany({
    where: { id: { in: [ids.vendorOrg, ids.deliveryOrg] } },
  });
  await prisma.profile.deleteMany({
    where: { userId: { in: [ids.customer, ids.vendor, ids.driver] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [ids.customer, ids.vendor, ids.driver] } },
  });
}

async function main() {
  assert(captureFile, "EMAIL_CAPTURE_FILE тохируулаагүй байна");
  await fs.writeFile(captureFile, "", "utf8");
  await seedFixture();

  const customerToken = token(ids.customer);
  const vendorToken = token(ids.vendor, ids.vendorOrg, OrgRole.OWNER);
  const driverToken = token(ids.driver, ids.deliveryOrg, OrgRole.STAFF);

  const checkout = await request<{ orderId: string }>("/api/store/checkout", {
    method: "POST",
    token: customerToken,
    body: JSON.stringify({
      lines: [{ productId: ids.product, qty: 2 }],
      phone: "99001122",
      email: `${runId}-customer@example.test`,
      shippingAddress: "E2E destination address",
      customerLat: 47.919,
      customerLng: 106.918,
    }),
  });
  orderId = checkout.orderId;

  const attempt = await prisma.orderDispatchAttempt.findFirstOrThrow({
    where: { orderId, status: "PENDING" },
  });
  await request(`/api/vendor/order-dispatches/${attempt.id}/accept`, {
    method: "POST",
    token: vendorToken,
  });
  const payment = await request<{
    qpayInvoiceId: string;
    qrText: string;
  }>(`/api/store/checkout/${orderId}/payment`, {
    method: "POST",
    token: customerToken,
  });
  assert(
    payment.qpayInvoiceId.startsWith("DEV-QPAY-"),
    "Local хөгжүүлэлтийн QPay invoice үүссэнгүй",
  );
  assert(
    payment.qrText.startsWith("mglstore://local-payment?"),
    "Local хөгжүүлэлтийн QR payload үүссэнгүй",
  );
  await request(`/api/store/checkout/${orderId}/dev-confirm`, {
    method: "POST",
    token: customerToken,
  });

  for (let step = 0; step < 3; step += 1) {
    await request(`/api/vendor/orders/${orderId}/status`, {
      method: "PATCH",
      token: vendorToken,
      body: JSON.stringify(
        step === 2
          ? {
              packageCount: 2,
              totalWeightKg: 4.5,
              packageLengthCm: 40,
              packageWidthCm: 30,
              packageHeightCm: 25,
              sizeCategory: "MEDIUM",
              isFragile: true,
              handlingInstructions: "Болгоомжтой зөөвөрлөнө үү",
            }
          : {},
      ),
    });
  }

  const jobs = await request<Array<Record<string, unknown>>>("/api/deliveries", {
    token: driverToken,
  });
  const job = jobs.find((item) => item.orderId === orderId);
  assert(job, "Бэлтгэгдсэн захиалга хүргэгчид харагдсангүй");
  assert(job.packageCount === 2, "Хайрцгийн тоо хүргэгчид дамжсангүй");
  assert(job.pickupAddress === "E2E pickup address", "Авах хаяг буруу");
  const deliveryOrder = job.order as Record<string, unknown> | undefined;
  assert(
    deliveryOrder?.shippingAddress === "E2E destination address",
    "Хүргэх хаяг буруу",
  );
  const deliveryId = String(job.id);

  await request(`/api/deliveries/${deliveryId}/status`, {
    method: "POST",
    token: driverToken,
    body: JSON.stringify({ status: "PICKING" }),
  });
  await request(`/api/deliveries/${deliveryId}/status`, {
    method: "POST",
    token: driverToken,
    body: JSON.stringify({ status: "DELIVERING" }),
  });

  const proof = new FormData();
  proof.set(
    "proof",
    new Blob(
      [
        Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=",
          "base64",
        ),
      ],
      { type: "image/png" },
    ),
    "delivery-proof.png",
  );
  const proofResponse = await request<{ proofImage: string }>(
    `/api/deliveries/${deliveryId}/proof`,
    { method: "POST", token: driverToken, body: proof },
  );
  proofImage = proofResponse.proofImage;
  await request(`/api/deliveries/${deliveryId}/status`, {
    method: "POST",
    token: driverToken,
    body: JSON.stringify({ status: "COMPLETED" }),
  });

  const finalOrder = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      history: { orderBy: { timestamp: "asc" } },
      delivery: true,
      items: true,
    },
  });
  assert(finalOrder.paymentStatus === "PAID", "Төлбөр PAID болоогүй");
  assert(finalOrder.status === "COMPLETED", "Захиалга COMPLETED болоогүй");
  assert(finalOrder.delivery?.status === "COMPLETED", "Хүргэлт COMPLETED болоогүй");
  assert(finalOrder.delivery?.proofImage, "Хүргэлтийн proof хадгалагдаагүй");
  const statusPath = finalOrder.history.map((item) => item.toStatus);
  const expectedStatusPath = [
    "PENDING",
    "CONFIRMED",
    "PREPARING",
    "PREPARED",
    "SHIPPING",
    "COMPLETED",
  ];
  assert(
    JSON.stringify(statusPath) === JSON.stringify(expectedStatusPath),
    `OrderHistory дараалал буруу: ${finalOrder.history
      .map((item) => `${item.toStatus}(${item.note ?? ""})`)
      .join(" → ")}`,
  );

  const captured = (await fs.readFile(captureFile, "utf8"))
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { to: string; subject: string });
  const subjects = captured.map((email) => email.subject);
  for (const expected of [
    "Шинэ захиалгын мэдэгдэл",
    "Захиалгыг хүлээн авлаа",
    "Захиалга бэлтгэгдэж байна",
    "Хүргэгч захиалгыг хүлээж авлаа",
    "Захиалга хүргэлтэд гарлаа",
    "Захиалга амжилттай хүргэгдлээ",
  ]) {
    assert(
      subjects.some((subject) => subject.includes(expected)),
      `Email capture-д “${expected}” алга`,
    );
  }

  console.log(
    JSON.stringify(
      {
        result: "PASS",
        orderNumber: finalOrder.orderNumber,
        statusPath,
        deliveryStatus: finalOrder.delivery.status,
        packageCount: finalOrder.delivery.packageCount,
        capturedEmails: captured.map(({ to, subject }) => ({ to, subject })),
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
    await cleanup().catch((error) => console.error("E2E cleanup failed", error));
    await prisma.$disconnect();
  });
