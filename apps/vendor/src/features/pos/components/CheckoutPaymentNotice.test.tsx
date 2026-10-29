import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CheckoutPaymentNotice } from "./CheckoutPaymentNotice";

test("2000 paid out of 12500 explicitly remains incomplete", () => {
  const html = renderToStaticMarkup(
    <CheckoutPaymentNotice paid={2000} remaining={10500} />,
  );
  assert.ok(html.includes("Хэсэгчилсэн төлбөр бүртгэгдлээ"));
  assert.ok(html.includes("₮2,000"));
  assert.ok(html.includes("₮10,500"));
  assert.ok(html.includes("Нийт төлбөр дуусаагүй байна"));
  assert.ok(!html.includes("Төлбөр бүрэн бүртгэгдлээ"));
});
test("a full payment still requires a recorded sale before returning to the register", () => {
  const html = renderToStaticMarkup(
    <CheckoutPaymentNotice paid={12500} remaining={0} />,
  );
  assert.ok(html.includes("Төлбөр бүрэн бүртгэгдлээ"));
  assert.ok(html.includes("Гүйлгээ батлах"));
  assert.ok(html.includes("Борлуулалт бүртгэгдсэний дараа касс руу буцна"));
});

test("a paid checkout shows the blocker instead of telling the cashier to press a disabled button", () => {
  const html = renderToStaticMarkup(
    <CheckoutPaymentNotice paid={7500} remaining={0} blocker="M Point мэдээллээ гүйцээнэ үү." />,
  );
  assert.ok(html.includes("Төлбөр бүрэн бүртгэгдлээ"));
  assert.ok(html.includes("M Point мэдээллээ гүйцээнэ үү."));
  assert.ok(!html.includes("«Гүйлгээ батлах» дарна уу"));
});
