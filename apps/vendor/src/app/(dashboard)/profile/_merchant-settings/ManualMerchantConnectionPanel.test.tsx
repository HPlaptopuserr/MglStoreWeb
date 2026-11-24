import * as React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ManualMerchantConnectionPanel } from "./ManualMerchantConnectionPanel";
Object.assign(globalThis, { React });
const props: React.ComponentProps<typeof ManualMerchantConnectionPanel> = {
  provider: "systemqr",
  merchantId: "",
  merchantKey: "",
  invoiceCode: "",
  recoveryRegNum: "",
  recoveryLoading: false,
  isSubmitting: false,
  onProviderChange: () => {},
  onMerchantIdChange: () => {},
  onMerchantKeyChange: () => {},
  onInvoiceCodeChange: () => {},
  onRecoveryRegNumChange: () => {},
  onRecover: () => {},
  onConnect: () => {},
};
test("Dynamic QR shows the merchant-code flow without the legacy register-number lookup", () => {
  const html = renderToStaticMarkup(
    <ManualMerchantConnectionPanel {...props} />,
  );
  assert.match(html, /Minu Merchant Code/);
  assert.match(html, /Minu мерчант холбох/);
  assert.match(html, /Minu Merchant-ийн тохиргоогоор удирдана/);
  assert.doesNotMatch(
    html,
    /Регистрийн дугаар|Бүртгэл хайж холбох|QPay QuickQR/,
  );
});
test("legacy register lookup remains under the explicitly selected QPay provider", () => {
  const html = renderToStaticMarkup(
    <ManualMerchantConnectionPanel {...props} provider="qpay" />,
  );
  assert.match(html, /QPay QuickQR/);
  assert.match(html, /Регистрийн дугаар/);
});
test("empty codes and duplicate submissions are disabled", () => {
  for (const values of [
    { merchantId: "  ", isSubmitting: false },
    { merchantId: "MGL_STEPPE_1795508501363", isSubmitting: true },
  ]) {
    const html = renderToStaticMarkup(
      <ManualMerchantConnectionPanel {...props} {...values} />,
    );
    assert.match(html, /<input[^>]*aria-label="Minu Merchant Code"/);
    assert.match(html, /<button type="button" disabled=""/);
  }
});
