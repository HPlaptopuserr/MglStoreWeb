import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { LegacyCreditBorrowerLinkDialog } from "./LegacyCreditBorrowerLinkDialog";

test("old borrower phone is only a lookup hint and cannot authorize linking debt", () => {
  const html = renderToStaticMarkup(
    <LegacyCreditBorrowerLinkDialog
      organizationId="org-a"
      creditSaleIds={["credit"]}
      expectedCredits={[
        {
          id: "credit",
          customerId: null,
          borrowerId: "old",
          borrowerPhone: "99489147",
          borrowerUserId: null,
        },
      ]}
      borrowerName="Legacy Person"
      borrowerPhone="99489147"
      totalDue={21600}
      targetType="CUSTOMER"
      onClose={() => {}}
      onLinked={() => {}}
    />,
  );
  assert.match(html, /Legacy Person/);
  assert.match(html, /21,600/);
  assert.match(html, /value="99489147"/);
  assert.match(html, /<button[^>]*disabled[^>]*>MGL бүртгэлд холбох<\/button>/);
  assert.match(html, /Зээлийн дүн, төлөлт болон төлөв өөрчлөгдөхгүй/);
});
