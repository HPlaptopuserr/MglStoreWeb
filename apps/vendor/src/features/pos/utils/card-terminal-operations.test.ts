import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReceiptPreview } from "../components/ReceiptPreview";
import type { RegisterConfig } from "../types/pos.types";
import {
  shiftSettlementTerminal,
  usesPairedAndroidPgwCommands,
} from "./card-terminal-operations";
import { createSalesHistoryDemo } from "./sales-history-demo";

const android = {
  id: "register",
  cardProviderType: "ANDROID_PGW",
  cardTerminalId: "terminal",
};

test("an Android provider alone does not enroll an existing till in new command APIs", () => {
  assert.equal(usesPairedAndroidPgwCommands(null), false);
  assert.equal(usesPairedAndroidPgwCommands(android), false);
  assert.equal(
    usesPairedAndroidPgwCommands({ ...android, bridgePairingRequired: false }),
    false,
  );
  assert.equal(
    usesPairedAndroidPgwCommands({ ...android, bridgePairingRequired: true }),
    true,
  );
  assert.equal(
    usesPairedAndroidPgwCommands({
      cardProviderType: "MINU_AGENT",
      bridgePairingRequired: true,
    }),
    false,
  );
});

test("only explicitly enrolled Android tills add PGW shift settlement", () => {
  assert.equal(shiftSettlementTerminal(android, "ANDROID_PGW"), undefined);
  assert.equal(
    shiftSettlementTerminal(
      { ...android, bridgePairingRequired: false },
      "ANDROID_PGW",
    ),
    undefined,
  );
  assert.deepEqual(
    shiftSettlementTerminal(
      { ...android, bridgePairingRequired: true },
      "ANDROID_PGW",
    ),
    { pgwRegisterId: "register" },
  );
  assert.equal(
    shiftSettlementTerminal({ ...android, bridgePairingRequired: true }, null),
    undefined,
  );
});

test("existing Push ECR settlement and other provider modes retain their original routing", () => {
  assert.equal(
    shiftSettlementTerminal(
      { ...android, cardProviderType: "PUSH_ECR" },
      "PUSH_ECR",
    ),
    "terminal",
  );
  assert.equal(
    shiftSettlementTerminal(
      { ...android, cardProviderType: "PUSH_ECR", cardTerminalId: null },
      "PUSH_ECR",
    ),
    undefined,
  );
  assert.equal(
    shiftSettlementTerminal(
      { ...android, cardProviderType: "MINU_AGENT" },
      "MINU_AGENT",
    ),
    undefined,
  );
  assert.equal(
    shiftSettlementTerminal({ ...android, cardProviderType: null }, null),
    undefined,
  );
});

for (const enrolled of [undefined, false, true]) {
  test(`receipt returns require PGW command proof only for enrolled registers (${String(enrolled)})`, () => {
    const register: RegisterConfig = {
      ...android,
      bridgePairingRequired: enrolled,
      mode: "RETAIL",
      name: "Register",
      label: null,
      cardEnabled: true,
      terminalBridgeUrl: "http://127.0.0.1:7420",
      qpayEnabled: false,
      effectiveQpayEnabled: false,
      qpayMerchantId: null,
      qpayTerminalId: null,
      ebarimtEnabled: false,
      ebarimtPosApiUrl: null,
      ebarimtMerchantTin: null,
      ebarimtPosNo: null,
      ebarimtMerchantName: null,
      isActive: true,
      branchId: "branch",
      organizationId: "store",
      branch: { id: "branch", name: "Branch" },
    };
    const base = createSalesHistoryDemo()[0]!;
    const receipt = {
      ...base,
      paymentMethod: "CARD",
      paymentBreakdown: [
        {
          method: "CARD",
          amount: base.grandTotal,
          attemptId: "attempt",
          traceno: "001234",
          terminalId: "terminal",
        },
      ],
    };
    const html = renderToStaticMarkup(
      createElement(ReceiptPreview, { register, receipt }),
    );
    const saleReturn = Array.from(
      html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g),
    ).find((match) => /Буцаалт хийх\s*$/.test(match[2]!));
    assert.ok(
      saleReturn,
      "sale return control must stay available in the existing receipt UI",
    );
    assert.equal(
      /\sdisabled(?:\s|=|$)/.test(saleReturn[1]!),
      enrolled === true,
    );
    assert.equal(
      html.includes(
        "Картын буцаалт баталгаажсаны дараа барааны буцаалт бүртгэнэ.",
      ),
      enrolled === true,
    );
  });
}
