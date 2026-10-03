const KITCHEN_PRINTER_STORAGE_KEY =
  "org_self_service_kitchen_printer_v1";
const PRINTER_BRIDGE_BASE_URL = "http://127.0.0.1:17358";

export type KitchenPrinterSettings = {
  enabled: boolean;
  printerName: string;
  paperWidthMm: 58 | 80;
};

export type KitchenTicketPrintPayload = {
  heading?: string;
  organizationName: string;
  registerName: string;
  ticketNo: string;
  orderLabel: string;
  createdAt: string;
  note?: string;
  items: Array<{
    name: string;
    qty: number;
    note?: string;
  }>;
};

export type LocalPrinterInventory = {
  defaultPrinter: string;
  printers: string[];
};

const DEFAULT_SETTINGS: KitchenPrinterSettings = {
  enabled: false,
  printerName: "",
  paperWidthMm: 80,
};

function toAsciiJson(value: unknown) {
  return JSON.stringify(value).replace(/[^\x20-\x7e]/g, (character) =>
    `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

async function readBridgeResponse(response: Response) {
  const payload = (await response.json().catch(() => null)) as {
    message?: string;
  } | null;
  if (!response.ok) {
    throw new Error(
      payload?.message ||
        "Гал тогооны принтерийн локал үйлчилгээнд холбогдож чадсангүй.",
    );
  }
  return payload;
}

export function loadKitchenPrinterSettings(): KitchenPrinterSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KITCHEN_PRINTER_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<KitchenPrinterSettings>;
    return {
      enabled: parsed.enabled === true,
      printerName:
        typeof parsed.printerName === "string" ? parsed.printerName : "",
      paperWidthMm: parsed.paperWidthMm === 58 ? 58 : 80,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveKitchenPrinterSettings(
  settings: KitchenPrinterSettings,
) {
  window.localStorage.setItem(
    KITCHEN_PRINTER_STORAGE_KEY,
    JSON.stringify(settings),
  );
}

export async function getLocalPrinterInventory(): Promise<LocalPrinterInventory> {
  const response = await fetch(`${PRINTER_BRIDGE_BASE_URL}/printers`, {
    method: "GET",
    cache: "no-store",
  });
  const payload = (await readBridgeResponse(response)) as {
    defaultPrinter?: unknown;
    printers?: unknown;
  };
  return {
    defaultPrinter:
      typeof payload.defaultPrinter === "string"
        ? payload.defaultPrinter
        : "",
    printers: Array.isArray(payload.printers)
      ? payload.printers.filter(
          (printer): printer is string => typeof printer === "string",
        )
      : [],
  };
}

export async function printKitchenTicket(
  payload: KitchenTicketPrintPayload,
  settings = loadKitchenPrinterSettings(),
) {
  if (!settings.enabled || !settings.printerName) return false;

  const response = await fetch(`${PRINTER_BRIDGE_BASE_URL}/kitchen/print`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: toAsciiJson({
      ...payload,
      printerName: settings.printerName,
      paperWidthMm: settings.paperWidthMm,
    }),
  });
  await readBridgeResponse(response);
  return true;
}
