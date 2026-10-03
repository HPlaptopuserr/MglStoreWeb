import { parseMerchantBankAccounts } from './merchant-bank-accounts';
import type { RegisterVendorSystemQrParams } from './vendor-merchant.service';

/** Validate settlement details before sending them to Minu. */
export function parseMinuRegistration(value: unknown, type: 'company' | 'person'): RegisterVendorSystemQrParams | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const text = (key: string) => typeof record[key] === 'string' ? record[key].trim() : '';
  const required = ['merchantName', 'cityId', 'districtId', 'khorooId', 'building', 'doorNo', 'phone', 'firstName', 'lastName', 'registerNumber', 'subCategoryId'];
  if (required.some(key => !text(key) || text(key).length > 120)) return null;
  if (!/^\+?[0-9]{8,15}$/.test(text('phone'))) return null;
  const email = text('email');
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return null;
  const corporateFlag = type === 'company' ? '1' : '0';
  if (text('corporateFlag') !== corporateFlag || (type === 'company' && !text('corporateName'))) return null;
  const gender = text('gender');
  if (gender !== 'M' && gender !== 'F') return null;
  const accounts = parseMerchantBankAccounts(record.bank_accounts);
  const account = accounts?.find(item => item.is_default);
  if (!account || account.account_bank_code !== text('bankCode') || account.account_number !== text('accountNumber').replace(/\s/g, '').toUpperCase()) return null;
  return {
    merchantName: text('merchantName'), accountNumber: account.account_number, bankCode: account.account_bank_code,
    cityId: text('cityId'), districtId: text('districtId'), khorooId: text('khorooId'),
    building: text('building'), doorNo: text('doorNo'), phone: text('phone'), email: email || null,
    firstName: text('firstName'), lastName: text('lastName'), corporateFlag,
    corporateName: type === 'company' ? text('corporateName') : null,
    registerNumber: text('registerNumber'), gender, subCategoryId: text('subCategoryId'),
    bank_accounts: accounts ?? [],
  };
}
