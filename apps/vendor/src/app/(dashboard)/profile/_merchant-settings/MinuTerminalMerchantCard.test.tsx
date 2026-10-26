import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MinuTerminalMerchantCard } from "./MinuTerminalMerchantCard";

test("a connected terminal shows its own merchant credentials without claiming a QR settlement account", () => {
  const html = renderToStaticMarkup(
    <MinuTerminalMerchantCard
      status={{ isConnected: true, username: "test-terminal", branchId: "1", passwordSet: true, connectedAt: null, orgName: "Test store" }}
      username="test-terminal" password="" branchId="1" isSubmitting={false}
      onUsernameChange={() => {}} onPasswordChange={() => {}} onBranchIdChange={() => {}}
      onConnect={() => {}} onDisconnect={() => {}}
    />,
  );
  assert.match(html, /test-terminal/);
  assert.match(html, /Branch ID:/);
  assert.match(html, /Холбогдсон/);
  assert.doesNotMatch(html, /Холбогдсон банкны данс|Дансны мэдээлэл хадгалагдаагүй|Үндсэн данс/);
});
