import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CheckoutPaymentError } from "./CheckoutPaymentError";
import type { PaymentFeedback } from "../types/payment-status.types";

const feedback: PaymentFeedback = { CARD: { kind: "failed", message: "Банк татгалзсан" } };
const base = { message: "Банк татгалзсан", tone: "not-found" as const, feedback, hasPendingQPay: false, cancelling: false, onCancel: () => {} };

test("a declined card does not label a new cash or QR payment as failed", () => {
  for (const method of ["CASH", "QR", "CREDIT"] as const)
    assert.equal(renderToStaticMarkup(<CheckoutPaymentError {...base} method={method} />), "");
  assert.ok(renderToStaticMarkup(<CheckoutPaymentError {...base} method="CARD" />).includes("Банк татгалзсан"));
  assert.equal(feedback.CARD?.message, "Банк татгалзсан", "per-method evidence is retained");
});
test("uncertain bank payments and pending QR warnings cannot be hidden by changing method", () => {
  assert.ok(renderToStaticMarkup(<CheckoutPaymentError {...base} method="CASH" feedback={{ CARD: { kind: "unknown", message: base.message } }} />).includes(base.message));
  const html = renderToStaticMarkup(<CheckoutPaymentError {...base} method="CASH" hasPendingQPay />);
  assert.ok(html.includes("QPay төлбөрийн анхааруулга"));
  assert.ok(html.includes("Гүйлгээ цуцалж, сагс цэвэрлэх"));
});
test("stock and checkout errors remain visible and idle state shows no stale alert", () => {
  assert.ok(renderToStaticMarkup(<CheckoutPaymentError {...base} method="CASH" message="Барааны нөөц хүрэлцэхгүй" />).includes("Барааны нөөц хүрэлцэхгүй"));
  assert.equal(renderToStaticMarkup(<CheckoutPaymentError {...base} method="CARD" tone="idle" />), "");
});
test("a recorded bank payment is never labelled as a failed card charge", () => {
  const html = renderToStaticMarkup(<CheckoutPaymentError {...base} method="CARD" message="Борлуулалт бүртгэх сервер түр саатлаа" confirmedPaid={50_000_000} />);
  assert.ok(html.includes("Төлбөр батлагдсан — борлуулалт дуусаагүй"));
  assert.ok(html.includes("Төлбөрийг дахин авахгүй"));
  assert.ok(!html.includes("Картын төлбөр амжилтгүй"));
});
test("an unknown bank response tells the cashier to check the existing charge", () => {
  const html = renderToStaticMarkup(<CheckoutPaymentError {...base} method="CARD" unknownCardPayment />);
  assert.ok(html.includes("Картын төлбөрийн төлөв тодорхойгүй"));
  assert.ok(!html.includes("Картын төлбөр амжилтгүй"));
});

test("insufficient funds displays the terminal explanation as a card failure", () => {
  const message = "Үлдэгдэл хүрээгүй";
  const html = renderToStaticMarkup(<CheckoutPaymentError {...base} method="CARD" message={message}
    feedback={{ CARD: { kind: "failed", message } }} />);
  assert.ok(html.includes('role="alert"'));
  assert.ok(html.includes(message));
  assert.ok(html.includes("Картын төлбөр амжилтгүй"));
  assert.ok(!html.includes("Картын төлбөрийн төлөв тодорхойгүй"));
});
