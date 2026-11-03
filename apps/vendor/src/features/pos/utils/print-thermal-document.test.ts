import test from "node:test";
import assert from "node:assert/strict";
import { printThermalDocument } from "./print-thermal-document";

test("async receipt printing supports 58 mm and 80 mm without a popup", async () => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  let prints = 0;
  let removed = false;
  let afterPrint: (() => void) | undefined;
  let documentMarkup = "";
  const pageStyle = { textContent: "" };
  const frame = {
    title: "", style: { cssText: "" }, onload: undefined as (() => void) | undefined,
    setAttribute() {}, remove() { removed = true; },
    contentWindow: {
      document: { fonts: { ready: Promise.resolve() }, readyState: "complete",
        body: { getBoundingClientRect: () => ({ height: 300 }) },
        getElementById: () => pageStyle, write(value: string) { documentMarkup = value; }, close() {} },
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
    assert.match(pageStyle.textContent, /size: 58mm/);
    assert.match(documentMarkup, /width: 58mm/);
    assert.match(documentMarkup, /padding: 2mm 5mm/);
    afterPrint?.();
    assert.equal(removed, true);

    removed = false;
    assert.equal(printThermalDocument({ bodyHtml: "receipt", paperWidthMm: 80 }), true);
    frame.onload?.();
    await Promise.resolve();
    assert.equal(prints, 2);
    assert.match(pageStyle.textContent, /size: 80mm/);
    assert.match(documentMarkup, /width: 80mm/);
    afterPrint?.();
    assert.equal(removed, true);
  } finally {
    for (const [name, descriptor] of [["window", oldWindow], ["document", oldDocument]] as const) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
});
