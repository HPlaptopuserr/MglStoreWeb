export type EbarimtRegisterConfigInput = {
  enabled: boolean;
  posApiUrl: string | null;
  merchantTin: string | null;
  posNo: string | null;
  merchantName: string | null;
};

const REQUIRED_EBARIMT_FIELDS: ReadonlyArray<
  readonly [keyof Omit<EbarimtRegisterConfigInput, "enabled">, string]
> = [
  ["posApiUrl", "PosAPI URL"],
  ["merchantTin", "Merchant TIN"],
  ["posNo", "POS дугаар"],
  ["merchantName", "Merchant нэр"],
];

export function validateEnabledEbarimtConfig(
  config: EbarimtRegisterConfigInput,
): string | null {
  if (!config.enabled) return null;

  const missingFields = REQUIRED_EBARIMT_FIELDS.filter(
    ([field]) => !config[field]?.trim(),
  ).map(([, label]) => label);

  return missingFields.length > 0
    ? `eBarimt идэвхтэй үед ${missingFields.join(", ")} шаардлагатай`
    : null;
}
