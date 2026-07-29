import type {
  ArchivedContract,
  ArchiveFieldDefinition,
} from "./types";
import { toTimestamp } from "./contract-utils";

type BuiltInField = ArchiveFieldDefinition & {
  getValue: (contract: ArchivedContract) => string | null;
};

export const BUILT_IN_ARCHIVE_FIELDS: BuiltInField[] = [
  { key: "contractName", label: "Гэрээний нэр", type: "text", getValue: (item) => item.contractName },
  { key: "contractNumber", label: "Гэрээний дугаар", type: "text", getValue: (item) => item.contractNumber },
  { key: "org", label: "Харилцагч байгууллага", type: "text", getValue: (item) => item.org },
  { key: "register", label: "Регистр", type: "text", getValue: (item) => item.register },
  { key: "director", label: "Захирал / төлөөлөгч", type: "text", getValue: (item) => item.director },
  { key: "position", label: "Албан тушаал", type: "text", getValue: (item) => item.position },
  { key: "phone", label: "Утас", type: "text", getValue: (item) => item.phone },
  { key: "email", label: "И-мэйл", type: "text", getValue: (item) => item.email },
  { key: "signedAt", label: "Байгуулсан огноо", type: "date", getValue: (item) => item.signedAt },
  { key: "expiresAt", label: "Дуусах огноо", type: "date", getValue: (item) => item.expiresAt },
];

const customFieldKey = (label: string) =>
  `custom:${label.toLocaleLowerCase("mn")}`;

export function getAvailableArchiveFields(
  contracts: ArchivedContract[],
): ArchiveFieldDefinition[] {
  const builtIns = BUILT_IN_ARCHIVE_FIELDS
    .filter((field) =>
      contracts.some((contract) => Boolean(field.getValue(contract)?.trim())),
    )
    .map(({ getValue: _getValue, ...field }) => field);
  const customFields = new Map<string, ArchiveFieldDefinition>();

  contracts.forEach((contract) => {
    contract.customFields.forEach((field) => {
      const key = customFieldKey(field.label);
      if (field.value.trim() && !customFields.has(key)) {
        customFields.set(key, { key, label: field.label, type: field.type });
      }
    });
  });

  return [...builtIns, ...customFields.values()];
}

export function getArchiveFieldValue(
  contract: ArchivedContract,
  field: ArchiveFieldDefinition,
): string | null {
  const builtIn = BUILT_IN_ARCHIVE_FIELDS.find(
    (candidate) => candidate.key === field.key,
  );
  if (builtIn) return builtIn.getValue(contract);
  return (
    contract.customFields.find(
      (customField) => customFieldKey(customField.label) === field.key,
    )?.value ?? null
  );
}

export function matchesArchiveField({
  contract,
  field,
  value,
  dateFrom,
  dateTo,
}: {
  contract: ArchivedContract;
  field: ArchiveFieldDefinition | null;
  value: string;
  dateFrom: string;
  dateTo: string;
}): boolean {
  if (!field) return true;
  const rawValue = getArchiveFieldValue(contract, field);

  if (field.type === "date") {
    const timestamp = toTimestamp(rawValue);
    const from = toTimestamp(dateFrom ? `${dateFrom}T00:00:00` : null);
    const to = toTimestamp(dateTo ? `${dateTo}T23:59:59.999` : null);
    return (
      timestamp !== null &&
      (from === null || timestamp >= from) &&
      (to === null || timestamp <= to)
    );
  }

  const normalizedValue = value.trim().toLocaleLowerCase("mn");
  if (!normalizedValue) return Boolean(rawValue?.trim());
  return Boolean(
    rawValue?.toLocaleLowerCase("mn").includes(normalizedValue),
  );
}
