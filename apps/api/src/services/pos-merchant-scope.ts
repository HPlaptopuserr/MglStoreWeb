/** Old invoices retain register routing; mobile invoices explicitly select the owner's organization. */
export function usesOrganizationMerchant(value: unknown): boolean {
  return typeof value === 'object' && value !== null && 'merchantScope' in value && value.merchantScope === 'ORGANIZATION';
}
