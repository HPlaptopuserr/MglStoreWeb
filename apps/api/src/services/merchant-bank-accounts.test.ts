import assert from 'node:assert/strict';
import test from 'node:test';
import { parseMerchantBankAccounts } from './merchant-bank-accounts';
import { usesOrganizationMerchant } from './pos-merchant-scope';

const account = { account_bank_code: '050000', account_number: '1234567890', account_name: 'Company', is_default: true };
test('bank account input is normalized and contains no unrelated attributes', () => {
  assert.deepEqual(parseMerchantBankAccounts([{ ...account, account_name: ' Company ', account_number: 'MN12 34567890', injected: true }]), [{ ...account, account_number: 'MN1234567890' }]);
});
test('malformed accounts, duplicate accounts and ambiguous defaults are rejected', () => {
  for (const value of [null, [], [account, account], [{ ...account, account_name: '' }], [{ ...account, account_number: '../1' }], [{ ...account, account_bank_code: 'BANK' }], [{ ...account, is_default: false }], [account, { ...account, account_number: '9999999999' }]]) {
    assert.equal(parseMerchantBankAccounts(value), null);
  }
});
test('new mobile requests explicitly select organization routing; old invoices retain legacy routing', () => {
  assert.equal(usesOrganizationMerchant({ merchantScope: 'ORGANIZATION' }), true);
  for (const value of [undefined, null, {}, { merchantScope: 'REGISTER' }]) assert.equal(usesOrganizationMerchant(value), false);
});
