import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CustomerDisplaySuccess } from "./CustomerDisplaySuccess";

const base = {text:"Төлбөр амжилттай", amount:24500, ts:1, saleCompleted:true};
test("cash change including zero is shown separately from the success heading", () => {
  const html = renderToStaticMarkup(<CustomerDisplaySuccess success={{...base, cash:{receivedAmount:24500,changeAmount:0}}}/>);
  assert.match(html, /<h2[^>]*>Төлбөр амжилттай<\/h2>/);
  assert.match(html, /<dt[^>]*>Хариулт<\/dt>/);
  assert.match(html, /₮0/);
  assert.match(html, /₮24,500/);
});
test("non-cash success has no cash fields and partial payment does not claim the sale is complete", () => {
  const html = renderToStaticMarkup(<CustomerDisplaySuccess success={{...base, saleCompleted:false,text:"Картын төлбөр хүлээн авлаа"}}/>);
  assert.doesNotMatch(html, /Авсан бэлэн|Хариулт|Худалдан авалт бүртгэгдлээ/);
  assert.match(html, /Картын төлбөр хүлээн авлаа/);
});
