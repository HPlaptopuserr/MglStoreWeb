import test from "node:test";
import assert from "node:assert/strict";
import {
  readLabelPrintSettings,
  saveLabelPrintSettings,
} from "../src/organisms/product-label-print/settings-storage";
import { DEFAULT_PRINT_SETTINGS } from "../src/organisms/product-label-print/layout";

test("label profiles survive reopen, reject corrupt data, and work with blocked storage", () => {
  const old = Object.getOwnPropertyDescriptor(globalThis, "window");
  let stored: string | null = null;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: () => stored,
        setItem: (_key: string, value: string) => {
          stored = value;
        },
      },
    },
  });
  try {
    const settings = {
      ...DEFAULT_PRINT_SETTINGS,
      paperPreset: "THERMAL" as const,
      thermalWidth: 58,
      thermalPageMode: "printer" as const,
      margin: 2,
    };
    saveLabelPrintSettings(settings);
    assert.deepEqual(readLabelPrintSettings(), settings);
    stored = '{"paperPreset":"INVALID"}';
    assert.deepEqual(readLabelPrintSettings(), DEFAULT_PRINT_SETTINGS);
    stored = '{"thermalWidth":"58"}';
    assert.deepEqual(readLabelPrintSettings(), DEFAULT_PRINT_SETTINGS);
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        get localStorage() {
          throw new Error("blocked");
        },
      },
    });
    saveLabelPrintSettings(settings);
    assert.deepEqual(readLabelPrintSettings(), settings);
  } finally {
    if (old) Object.defineProperty(globalThis, "window", old);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
