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
    title: "",
    style: { cssText: "" },
    onload: undefined as (() => void) | undefined,
    setAttribute() {},
    remove() {
      removed = true;
    },
    contentWindow: {
      document: {
        fonts: { ready: Promise.resolve() },
        readyState: "complete",
        body: { getBoundingClientRect: () => ({ height: 300 }) },
        getElementById: (id: string) =>
          id === "thermal-page-size" ? pageStyle : null,
        write(value: string) {
          documentMarkup = value;
        },
        open() {},
        close() {},
      },
      requestAnimationFrame(callback: () => void) {
        callback();
      },
      addEventListener(name: string, callback: () => void) {
        if (name === "afterprint") afterPrint = callback;
      },
      focus() {},
      print() {
        prints++;
      },
    },
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      open() {
        throw new Error("Popup blocked");
      },
    },
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      createElement: () => frame,
      body: { appendChild() {} },
    },
  });
  try {
    assert.equal(printThermalDocument({ bodyHtml: "receipt" }), true);
    frame.onload?.();
    await Promise.resolve();
    assert.equal(prints, 1);
    assert.equal(removed, false);
    assert.match(pageStyle.textContent, /size: 58mm/);
    assert.match(documentMarkup, /max-width: 58mm/);
    assert.match(frame.style.cssText, /width:58mm/);
    assert.doesNotMatch(documentMarkup, /overflow: hidden/);
    assert.match(documentMarkup, /padding: 2mm 5mm/);
    afterPrint?.();
    assert.equal(removed, true);

    removed = false;
    assert.equal(
      printThermalDocument({ bodyHtml: "receipt", paperWidthMm: 80 }),
      true,
    );
    frame.onload?.();
    await Promise.resolve();
    assert.equal(prints, 2);
    assert.match(pageStyle.textContent, /size: 80mm/);
    assert.match(documentMarkup, /max-width: 80mm/);
    assert.match(frame.style.cssText, /width:80mm/);
    afterPrint?.();
    assert.equal(removed, true);
    removed = false;
    assert.equal(
      printThermalDocument({
        bodyHtml: "receipt",
        paperWidthMm: 58,
        pageMode: "printer",
      }),
      true,
    );
    await Promise.resolve();
    assert.equal(prints, 3);
    assert.equal(pageStyle.textContent, "@page { size: auto; margin: 0; }");
    afterPrint?.();
    assert.equal(removed, true);
  } finally {
    for (const [name, descriptor] of [
      ["window", oldWindow],
      ["document", oldDocument],
    ] as const) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
});

test("manual receipts print in a visible window that remains available for retries", async () => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const events: string[] = [];
  let printCount = 0;
  let markup = "";
  let retry: (() => void) | undefined;
  const pageStyle = { textContent: "" };
  const popup = {
    closed: false,
    document: {
      readyState: "complete",
      fonts: { ready: Promise.resolve() },
      body: { getBoundingClientRect: () => ({ height: 300 }) },
      getElementById: (id: string) => id === "thermal-page-size" ? pageStyle : {
        addEventListener: (_name: string, callback: () => void) => { retry = callback; },
      },
      open() {},
      write(value: string) { markup = value; },
      close() {},
    },
    addEventListener: (name: string) => { events.push(name); },
    requestAnimationFrame: (callback: () => void) => { events.push("frame"); callback(); },
    focus() {},
    print() { printCount++; },
    close() { throw new Error("Manual print windows must remain open"); },
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    open: (_url: string, target: string) => { assert.equal(target, "_blank"); return popup; },
  } });
  try {
    assert.equal(printThermalDocument({ bodyHtml: "RECEIPT", paperWidthMm: 58, pageMode: "printer", target: "window" }), true);
    await Promise.resolve();
    assert.equal(printCount, 1);
    assert.equal(events.filter(event => event === "frame").length, 2);
    assert.ok(!events.includes("afterprint"));
    assert.match(markup, /thermal-print-again/);
    assert.match(markup, /display: none !important/);
    assert.equal(pageStyle.textContent, "@page { size: auto; margin: 0; }");
    retry?.();
    assert.equal(printCount, 2);
  } finally {
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("blocked manual print windows return a failure for the caller to show", () => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { open: () => null } });
  try {
    assert.equal(printThermalDocument({ bodyHtml: "RECEIPT", target: "window" }), false);
  } finally {
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
