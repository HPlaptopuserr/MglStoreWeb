import assert from "node:assert/strict";
import test from "node:test";
import { authEmailTemplates } from "./templates/auth-email.templates";
import { orderEmailTemplates } from "./templates/order-email.templates";
import { vendorEmailTemplates } from "./templates/vendor-email.templates";

test("password reset template contains matching HTML and text content", () => {
  const template = authEmailTemplates.passwordResetOtp("123456");

  assert.match(template.subject, /нууц үг сэргээх/i);
  assert.match(template.text, /123456/);
  assert.match(template.html, /123456/);
  assert.match(template.html, /10 минут/);
});

test("new order template includes contact details and escapes HTML", () => {
  const template = orderEmailTemplates.newOrder({
    orderNumber: "ORD-100",
    customerName: "<Test User>",
    customerPhone: "99112233",
    shippingAddress: "БЗД <script>",
    total: 125000,
    organizationName: "Nama",
    detailUrl:
      "https://mglstore.mn/profile/organizations/org-1?incomingOrders=1&orderId=order-1",
  });

  assert.match(template.text, /99112233/);
  assert.match(template.text, /125,000₮/);
  assert.doesNotMatch(template.html, /<script>/);
  assert.match(template.html, /&lt;script&gt;/);
  assert.match(template.text, /Nama/);
  assert.match(template.html, /incomingOrders=1&amp;orderId=order-1/);
});

test("vendor confirmation template preserves the confirmation URL", () => {
  const template = vendorEmailTemplates.phoneConfirmation({
    fullName: "Бат",
    organizationName: "MGL Shop",
    phone: "99001122",
    confirmUrl: "https://mglstore.mn/confirm?token=abc",
  });

  assert.match(template.text, /99001122/);
  assert.match(template.html, /https:\/\/mglstore.mn\/confirm\?token=abc/);
});
