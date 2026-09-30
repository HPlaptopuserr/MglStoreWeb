import test from "node:test";
import assert from "node:assert/strict";
import { printThermalDocument } from "./print-thermal-document";

test("async receipt printing needs no popup, prints once, and retains frame until afterprint", async () => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  let prints = 0;
  let removed = false;
  let afterPrint: (() => void) | undefined;
  const pageStyle = { textContent: "" };
  const frame = {
    title: "", style: { cssText: "" }, onload: undefined as (() => void) | undefined,
    setAttribute() {}, remove() { removed = true; },
    contentWindow: {
      document: { fonts: { ready: Promise.resolve() }, readyState: "complete",
        body: { getBoundingClientRect: () => ({ height: 300 }) },
        getElementById: () => pageStyle, write() {}, close() {} },
      requestAnimationFrame(callback: () => void) { callback(); },
      addEventListener(name: string, callback: () => void) { if (name === "afterprint") afterPrint = callback; },
      focus() {}, print() { prints++; },
    },
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: { open() { throw new Error("Popup blocked"); } } });
  Object.defineProperty(globalThis, "document", { configurable: true, value: {
    createElement: () => frame, body: { appendChild() {} },
  } });
  try {
    assert.equal(printThermalDocument({ bodyHtml: "receipt" }), true);
    frame.onload?.();
    await Promise.resolve();
    assert.equal(prints, 1);
    assert.equal(removed, false);
    assert.match(pageStyle.textContent, /size: 80mm/);
    afterPrint?.();
    assert.equal(removed, true);
  } finally {
    for (const [name, descriptor] of [["window", oldWindow], ["document", oldDocument]] as const) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
});
