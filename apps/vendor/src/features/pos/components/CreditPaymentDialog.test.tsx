import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CreditPaymentDialog } from "./CreditPaymentDialog";

test("saved borrower details alone never enable issuing a new credit", () => {
  const html = renderToStaticMarkup(
    <CreditPaymentDialog
      amount={30000}
      organizationId="org-a"
      onClose={() => {}}
      onConfirm={() => {}}
      borrowers={[
        {
          id: "saved",
          targetType: "CUSTOMER",
          borrowerId: "legacy-phone-id",
          borrowerName: "Saved Name",
          borrowerPhone: "99489147",
          createdAt: "2026-11-23",
          updatedAt: "2026-11-23",
        },
      ]}
    />,
  );
  assert.match(html, /MGL-д бүртгэлтэй хэрэглэгч шаардлагатай/);
  assert.match(html, /MGL хэрэглэгч шалгах/);
  assert.match(html, /<button[^>]*disabled[^>]*>Зээлээр нэмэх<\/button>/);
  assert.ok(
    !html.includes("Зээлдэгчийн нэр</span>"),
    "the cashier must not type a substitute registered identity",
  );
  assert.ok(!html.includes("шинэ зээлдэгчийн мэдээллийг оруулна уу"));
});
