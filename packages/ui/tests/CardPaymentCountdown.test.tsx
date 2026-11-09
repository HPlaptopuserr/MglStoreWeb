import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CardPaymentCountdown } from "../src/molecules/CardPaymentCountdown";

test("card wait exposes the remaining seconds without announcing every tick", t => {
  t.mock.method(Date, "now", () => 1000);
  const html = renderToStaticMarkup(createElement(CardPaymentCountdown, { deadline: 31_000 }));
  assert.match(html, /role="timer"/);
  assert.match(html, /aria-label="30 секунд үлдсэн"/);
  assert.match(html, /aria-live="off"/);
});

test("expired wait explains that the financial outcome is still being checked", t => {
  t.mock.method(Date, "now", () => 40_000);
  const html = renderToStaticMarkup(createElement(CardPaymentCountdown, { deadline: 31_000 }));
  assert.match(html, /aria-label="0 секунд үлдсэн"/);
  assert.match(html, /Төлбөрийн эцсийн хариуг шалгаж байна/);
  assert.doesNotMatch(html, /Цуцлагдлаа|Амжилтгүй|Төлбөр амжилттай/);
});
