import type { RegisterConfig } from "@mgl/types";
import { Download, Usb } from "lucide-react";
import { effectiveCardProvider } from "../utils/card-register-provider";

// This Windows release passed packaging, runtime and checksum verification.
export const USB_BRIDGE_INSTALLER_URL: string | null =
  "https://github.com/HPlaptopuserr/MglStoreWeb/releases/download/pax-a35-bridge-20261124-cancel/MGL-POS-Bridge-android-pgw-Installer.exe";

type UsbBridgeDownloadSectionProps = {
  organizationId: string;
  registers: readonly RegisterConfig[];
  selectedRegisterId: string | null;
  installerUrl: string | null;
};

export function UsbBridgeDownloadSection({
  organizationId,
  registers,
  selectedRegisterId,
  installerUrl,
}: UsbBridgeDownloadSectionProps) {
  const ownRegisters = registers.filter(
    (register) =>
      register.organizationId === organizationId && register.mode === "RETAIL",
  );
  const register = selectedRegisterId
    ? ownRegisters.find((item) => item.id === selectedRegisterId)
    : ownRegisters.length === 1
      ? ownRegisters[0]
      : null;

  if (
    !installerUrl ||
    !organizationId ||
    !register?.isActive ||
    !register.cardEnabled ||
    register.cardPaymentMode === "MANUAL" ||
    register.hasOwnCardTerminal === false ||
    !register.terminalBridgeUrl?.trim() ||
    effectiveCardProvider(register) !== "ANDROID_PGW"
  )
    return null;

  return (
    <section
      aria-labelledby="usb-bridge-download-title"
      className="rounded-3xl border border-blue-200 bg-blue-50/60 p-5 md:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id="usb-bridge-download-title"
            className="flex items-center gap-2 text-base font-black text-blue-900"
          >
            <Usb aria-hidden="true" className="h-5 w-5 shrink-0" />
            USB картын төхөөрөмжийн Bridge
          </h2>
          <p className="mt-1 text-sm font-medium text-blue-800">
            Касс: {register.label || register.name}
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-600">
            <li>Кассын Windows компьютер дээр суулгагчийг татаж ажиллуулна.</li>
            <li>
              Анх суулгаж байгаа бол админаас өгсөн холбох линкийг оруулна.
            </li>
            <li>Картын төхөөрөмжөө USB кабелиар холбоод POS дээр төлөвийг шалгана.</li>
          </ol>
        </div>
        <a
          href={installerUrl}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <Download aria-hidden="true" className="h-4 w-4" />
          Bridge татах
          <span className="sr-only"> — Windows суулгагч</span>
        </a>
      </div>
    </section>
  );
}
