import test from "node:test";
import assert from "node:assert/strict";
import { printLabelWindow } from "../src/organisms/product-label-print/print-window";

function createPrintWindow(readyState: DocumentReadyState = "loading") {
  const events = new EventTarget();
  const frames: FrameRequestCallback[] = [];
  const calls: string[] = [];
  let resolveFonts: () => void = () => {};
  const fontsReady = new Promise<void>((resolve) => {
    resolveFonts = resolve;
  });
  const popup = {
    closed: false,
    document: {
      readyState,
      fonts: { ready: fontsReady },
      body: {
        getBoundingClientRect: () => {
          calls.push("layout");
        },
      },
    },
    addEventListener: events.addEventListener.bind(events),
    requestAnimationFrame: (callback: FrameRequestCallback) =>
      frames.push(callback),
    focus: () => {
      calls.push("focus");
    },
    print: () => {
      calls.push("print");
    },
  };
  // Only the browser APIs used by this helper are implemented by this test window.
  return {
    window: popup as unknown as Window,
    popup,
    frames,
    calls,
    resolveFonts,
    load: () => {
      popup.document.readyState = "complete";
      events.dispatchEvent(new Event("load"));
    },
  };
}

const flushPromises = () =>
  new Promise<void>((resolve) => setImmediate(resolve));

test("printing waits for load, fonts and both render frames before taking the print snapshot", async () => {
  const fixture = createPrintWindow();
  const printing = printLabelWindow(fixture.window);
  await flushPromises();
  assert.deepEqual(fixture.calls, []);
  assert.equal(fixture.frames.length, 0);
  fixture.load();
  await flushPromises();
  assert.equal(fixture.frames.length, 0);
  fixture.resolveFonts();
  await flushPromises();
  assert.equal(fixture.frames.length, 1);
  fixture.frames.shift()?.(0);
  assert.deepEqual(fixture.calls, []);
  fixture.frames.shift()?.(16);
  await printing;
  assert.deepEqual(fixture.calls, ["layout", "focus", "print"]);
});

test("an already loaded document prints without waiting for another load event", async () => {
  const fixture = createPrintWindow("complete");
  const printing = printLabelWindow(fixture.window);
  fixture.resolveFonts();
  await flushPromises();
  fixture.frames.shift()?.(0);
  fixture.frames.shift()?.(16);
  await printing;
  assert.equal(fixture.calls.at(-1), "print");
});

test("closing a print window during preparation prevents a print call", async () => {
  const fixture = createPrintWindow("complete");
  const printing = printLabelWindow(fixture.window);
  fixture.popup.closed = true;
  fixture.resolveFonts();
  await printing;
  assert.deepEqual(fixture.calls, []);
});
