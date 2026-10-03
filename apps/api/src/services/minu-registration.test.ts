import assert from 'node:assert/strict';
import test from 'node:test';
import { parseMinuRegistration } from './minu-registration';

const account = { account_bank_code: '050000', account_number: 'MN001234567890', account_name: 'Owner', is_default: true };
const registration = {
  merchantName: 'Store', corporateFlag: '1', corporateName: 'Company',
  firstName: 'Owner', lastName: 'Name', registerNumber: '1234567', gender: 'M',
  phone: '99112233', cityId: '1', districtId: '2', khorooId: '3', building: 'Building', doorNo: '1', subCategoryId: '4',
  bankCode: account.account_bank_code, accountNumber: account.account_number, bank_accounts: [account],
};
test('Minu registration passes the owner-selected settlement account', () => {
  const result = parseMinuRegistration(registration, 'company');
  assert.equal(result?.accountNumber, account.account_number);
  assert.deepEqual(result?.bank_accounts, [account]);
});
test('Minu registration rejects mismatched settlement, identity and missing address', () => {
  assert.equal(parseMinuRegistration({ ...registration, accountNumber: '987654321' }, 'company'), null);
  assert.equal(parseMinuRegistration({ ...registration, corporateFlag: '0' }, 'company'), null);
  assert.equal(parseMinuRegistration({ ...registration, khorooId: '' }, 'company'), null);
  assert.equal(parseMinuRegistration({ ...registration, bank_accounts: [] }, 'company'), null);
});
