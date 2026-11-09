import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PosCheckoutView, type PosCheckoutProps } from "./PosCheckoutView";

const noop = () => {};
const base: PosCheckoutProps = {
  lines: [{ productId: "coffee", name: "Coffee", unitPrice: 7500, baseUnitPrice: 7500, qty: 1, stockQty: 10, priceType: "UNIT", taxRate: 0, discountAmount: 0 }],
  totals: { subTotal: 7500, grandTotal: 7500, taxTotal: 0, discountTotal: 0 },
  paymentMethod: "CARD", paymentEntries: [], remaining: 7500,
  onChangeMethod: noop, onAddPayment: noop, onRequestQPay: noop, onMarkQPayPaid: noop,
  onRemovePayment: noop, onResetPayments: noop, onFinalize: noop, onFinalizeCash: noop,
  canFinalize: false, onBack: noop, onCancelCheckout: noop,
  loyalty: { mode: "NONE", phone: "", lookupLoading: false, lookupError: "", found: false, balance: 0, earnRate: 0, membershipBadge: "NONE", redeemPoints: 0 },
  onLoyaltyChange: noop, onLookupLoyalty: noop, onRequestLoyaltyRedeemQr: noop,
  onRefreshLoyaltyRedeemSession: noop, onClearLoyaltyRedeemSession: noop,
};
function methodButton(html: string, shortcut: string): string {
  const button = html.match(new RegExp(`<button[^>]*aria-keyshortcuts="${shortcut}"[^>]*>`))?.[0];
  assert.ok(button, shortcut);
  return button;
}

for (const paymentMethod of ["CARD", "QR"] as const) {
  test(`${paymentMethod} pending allows requesting another method but keeps payment submission blocked`, () => {
    const html = renderToStaticMarkup(<PosCheckoutView {...base} paymentMethod={paymentMethod}
      paymentEntries={[{ id: "pending", method: paymentMethod, amount: 7500, status: "pending" }]}
      disabled methodSwitchDisabled={false} methodSwitchMessage="Өмнөх төлбөрийн цуцлалтыг хүлээж байна." />);
    assert.ok(!methodButton(html, "F10").includes("disabled"));
    assert.ok(!methodButton(html, "F11").includes("disabled"));
    assert.match(html, /<button[^>]*disabled[^>]*>Гүйлгээ батлах/);
    assert.ok(html.includes("Өмнөх төлбөрийн цуцлалтыг хүлээж байна."));
  });
}

test("in-flight cancellation locks method changes to avoid overlapping provider requests", () => {
  const html = renderToStaticMarkup(<PosCheckoutView {...base} disabled methodSwitchDisabled />);
  assert.ok(methodButton(html, "F10").includes("disabled"));
  assert.ok(methodButton(html, "F11").includes("disabled"));
});
