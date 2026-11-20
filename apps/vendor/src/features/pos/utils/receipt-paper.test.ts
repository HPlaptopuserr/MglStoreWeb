import test from "node:test";
import assert from "node:assert/strict";
import {
  readReceiptCompact,
  saveReceiptCompact,
  readReceiptPageMode,
  readReceiptPaperWidth,
  saveReceiptPageMode,
  saveReceiptPaperWidth,
} from "./receipt-paper";

test("receipt preferences persist and blocked storage retains the selected session settings", () => {
  const old = Object.getOwnPropertyDescriptor(globalThis, "window");
  const stored = new Map<string, string>();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => stored.get(key) ?? null,
        setItem: (key: string, value: string) => {
          stored.set(key, value);
        },
      },
    },
  });
  try {
    assert.equal(readReceiptCompact(), false);
    saveReceiptCompact(true);
    assert.equal(readReceiptCompact(), true);
    assert.equal(readReceiptPaperWidth(), 58);
    assert.equal(readReceiptPageMode(), "receipt");
    saveReceiptPaperWidth(80);
    saveReceiptPageMode("printer");
    assert.equal(readReceiptPaperWidth(), 80);
    assert.equal(readReceiptPageMode(), "printer");
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        get localStorage() {
          throw new Error("blocked");
        },
      },
    });
    saveReceiptPaperWidth(58);
    saveReceiptPageMode("printer");
    assert.equal(readReceiptPaperWidth(), 58);
    assert.equal(readReceiptPageMode(), "printer");
  } finally {
    if (old) Object.defineProperty(globalThis, "window", old);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
