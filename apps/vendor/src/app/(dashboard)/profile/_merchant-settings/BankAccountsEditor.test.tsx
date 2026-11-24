import * as React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BankAccountsEditor } from "./BankAccountsEditor";
Object.assign(globalThis, { React });
const props: React.ComponentProps<typeof BankAccountsEditor> = {
  loadState: "ready",
  canEdit: true,
  onRetry: () => {},
  savedAccounts: [],
  editingAccounts: [],
  confirmNumbers: [],
  isEditing: true,
  isSubmitting: false,
  managedBySystem: true,
  onStartEditing: () => {},
  onAccountsChange: () => {},
  onConfirmNumbersChange: () => {},
  onSave: () => {},
  onCancel: () => {},
};
test("Minu settlement snapshots remain visible with no editing controls", () => {
  const html = renderToStaticMarkup(
    <BankAccountsEditor
      {...props}
      savedAccounts={[
        {
          account_bank_code: "050000",
          account_number: "123456789",
          account_name: "Test owner",
          is_default: true,
        },
      ]}
    />,
  );
  assert.match(html, /123456789/);
  assert.match(html, /Test owner/);
  assert.match(html, /Minu Merchant дээр дараа нь өөрчилсөн данс/);
  assert.doesNotMatch(html, /<input|<select|Данс нэмэх|Хадгалах/);
});
test("missing provider account data is distinguished from a missing settlement account", () => {
  const html = renderToStaticMarkup(<BankAccountsEditor {...props} />);
  assert.match(html, /данс бүртгэлгүй гэсэн үг биш/);
  assert.doesNotMatch(html, /данс нэмнэ үү|Данс нэмэх/);
});
