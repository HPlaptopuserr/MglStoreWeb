import {
  DEFAULT_PRINT_SETTINGS,
  calculatePrintLayout,
  type LabelPrintSettings,
} from "./layout";

const STORAGE_KEY = "mgl_product_label_print_settings";
let sessionSettings = DEFAULT_PRINT_SETTINGS;
let storageWriteFailed = false;

export function readLabelPrintSettings(): LabelPrintSettings {
  if (storageWriteFailed) return sessionSettings;
  if (typeof window === "undefined") return DEFAULT_PRINT_SETTINGS;
  try {
    const raw: unknown = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "null",
    );
    if (!raw || typeof raw !== "object") return sessionSettings;
    const candidate = { ...DEFAULT_PRINT_SETTINGS, ...raw };
    if (
      !Object.entries(DEFAULT_PRINT_SETTINGS).every(
        ([key, value]) =>
          typeof candidate[key as keyof LabelPrintSettings] === typeof value,
      )
    )
      return DEFAULT_PRINT_SETTINGS;
    if (
      (candidate.thermalCompact !== undefined &&
        typeof candidate.thermalCompact !== "boolean") ||
      !["A4", "A5", "LETTER", "CUSTOM", "THERMAL"].includes(
        candidate.paperPreset,
      ) ||
      !["portrait", "landscape"].includes(candidate.orientation) ||
      !["receipt", "printer"].includes(
        candidate.thermalPageMode ?? "receipt",
      ) ||
      !calculatePrintLayout(candidate).fitsOnPage
    )
      return DEFAULT_PRINT_SETTINGS;
    return candidate;
  } catch {
    return sessionSettings;
  }
}

export function saveLabelPrintSettings(settings: LabelPrintSettings): void {
  sessionSettings = settings;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    storageWriteFailed = false;
  } catch {
    storageWriteFailed = true;
    // Keep the selected profile for this session if storage is unavailable.
  }
}
