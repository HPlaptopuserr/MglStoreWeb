import assert from "node:assert/strict";
import { test } from "node:test";
import { masterplanViewport } from "./masterplan-viewport";

test("fill covers the viewport without changing the image aspect ratio", () => {
  for (const viewport of [
    { width: 1920, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    const image = { width: 1600, height: 900 };
    const map = masterplanViewport(viewport, image, "fill", 1);
    assert.ok(map.width >= viewport.width);
    assert.ok(map.height >= viewport.height);
    assert.ok(
      Math.abs(map.width / map.height - image.width / image.height) < 1e-10,
    );
    // A pin at the image centre remains at the viewport centre after centring the scroll area.
    const scrollLeft = (map.spaceWidth - viewport.width) / 2;
    const scrollTop = (map.spaceHeight - viewport.height) / 2;
    assert.equal(map.left + map.width / 2 - scrollLeft, viewport.width / 2);
    assert.equal(map.top + map.height / 2 - scrollTop, viewport.height / 2);
  }
});

test("fit keeps every marker in the viewport and zoom preserves its image position", () => {
  const viewport = { width: 390, height: 844 };
  const image = { width: 1600, height: 900 };
  const fit = masterplanViewport(viewport, image, "fit", 1);
  assert.ok(fit.width <= viewport.width && fit.height <= viewport.height);
  assert.equal(fit.left, 0);
  assert.equal(fit.top + fit.height / 2, viewport.height / 2);
  const zoomed = masterplanViewport(viewport, image, "fit", 2);
  assert.equal(zoomed.width, fit.width * 2);
  assert.equal(zoomed.height, fit.height * 2);
});
