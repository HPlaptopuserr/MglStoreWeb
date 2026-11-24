import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { RegisterConfig } from "@mgl/types";
import { USB_BRIDGE_INSTALLER_URL, UsbBridgeDownloadSection } from "./UsbBridgeDownloadSection";

const installerUrl = USB_BRIDGE_INSTALLER_URL;
const usbRegister: RegisterConfig = {
  id: "usb-till",
  mode: "RETAIL",
  name: "Касс 1",
  label: null,
  organizationId: "store-1",
  branchId: "branch-1",
  branch: { id: "branch-1", name: "Салбар 1" },
  isActive: true,
  cardEnabled: true,
  cardFlowVersion: 2,
  cardPaymentMode: "API",
  hasOwnCardTerminal: true,
  cardProviderType: "ANDROID_PGW",
  cardTerminalId: "private-terminal",
  terminalBridgeUrl: "http://127.0.0.1:8787",
  qpayEnabled: true,
  effectiveQpayEnabled: true,
  qpayMerchantId: null,
  qpayTerminalId: null,
  ebarimtEnabled: false,
  ebarimtPosApiUrl: null,
  ebarimtMerchantTin: null,
  ebarimtPosNo: null,
  ebarimtMerchantName: null,
};

function render(
  registers: readonly RegisterConfig[],
  selectedRegisterId: string | null = "usb-till",
  organizationId = "store-1",
  url: string | null = installerUrl,
) {
  return renderToStaticMarkup(
    <UsbBridgeDownloadSection
      organizationId={organizationId}
      registers={registers}
      selectedRegisterId={selectedRegisterId}
      installerUrl={url}
    />,
  );
}

test("an enabled USB till renders the Windows installer and installation steps without device credentials", () => {
  assert.ok(installerUrl);
  const html = render([usbRegister]);
  assert.match(html, /Bridge татах/);
  assert.match(html, /Касс 1/);
  assert.match(html, /Windows компьютер/);
  assert.match(html, /USB кабелиар/);
  assert.ok(html.includes(`href="${installerUrl}"`));
  assert.doesNotMatch(
    html,
    /private-terminal|127\.0\.0\.1|pairing|authRoot|secret/i,
  );
});

test("existing USB tills remain eligible without a pairing opt-in or a new card-flow version", () => {
  assert.match(
    render([
      {
        ...usbRegister,
        cardFlowVersion: undefined,
        bridgePairingRequired: undefined,
      },
    ]),
    /Bridge татах/,
  );
  assert.match(render([usbRegister], null), /Bridge татах/);
});

test("other payment setups and disabled or unconfigured tills never render an installer", () => {
  const ineligible: Partial<RegisterConfig>[] = [
    { cardProviderType: "MINU_AGENT" },
    { cardProviderType: "PUSH_ECR" },
    { cardProviderType: "QPOSLANE" },
    { cardProviderType: null },
    { cardEnabled: false },
    { cardEnabled: false, cardProviderType: null, effectiveQpayEnabled: true },
    { cardPaymentMode: "MANUAL" },
    { cardFlowVersion: undefined, cardPaymentMode: "MANUAL" },
    { hasOwnCardTerminal: false },
    { terminalBridgeUrl: null },
    { terminalBridgeUrl: " " },
    { isActive: false },
    { mode: "RESTAURANT" },
  ];
  for (const configuration of ineligible) {
    assert.equal(
      render([{ ...usbRegister, ...configuration }]),
      "",
      JSON.stringify(configuration),
    );
  }
  assert.equal(render([]), "");
  assert.equal(render([usbRegister], "usb-till", ""), "");
  assert.equal(render([usbRegister], "usb-till", "store-1", null), "");
});

test("a USB till never enables the installer for another selected till or organization", () => {
  const minuRegister: RegisterConfig = {
    ...usbRegister,
    id: "minu-till",
    name: "Касс 2",
    cardProviderType: "MINU_AGENT",
  };
  assert.equal(render([usbRegister, minuRegister], "minu-till"), "");
  assert.equal(render([usbRegister, minuRegister], null), "");
  assert.equal(render([usbRegister], "missing-till"), "");
  assert.equal(render([usbRegister], "usb-till", "store-2"), "");
  assert.equal(render([{ ...usbRegister, organizationId: "store-2" }]), "");
  assert.match(render([usbRegister, minuRegister], "usb-till"), /Bridge татах/);
});
