export type StudyTicketOption = {
  id: string;
  label: string;
  price: number;
};

function normalizePrice(value: unknown) {
  const price = Number(value ?? 0);
  return Number.isFinite(price) && price > 0 ? Math.round(price) : 0;
}

export function normalizeStudyTicketOptions(
  value: unknown,
): StudyTicketOption[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((option, index) => ({
      id: String(option?.id || "").trim() || `ticket-${index + 1}`,
      label: String(option?.label || "").trim(),
      price: normalizePrice(option?.price),
    }))
    .filter((option) => option.label)
    .slice(0, 6);
}

export function resolveStudyTicketSelection({
  options,
  requestedId,
  fallbackPrice,
}: {
  options: StudyTicketOption[];
  requestedId?: string;
  fallbackPrice: unknown;
}) {
  const ticketOptionId = String(requestedId || "").trim();
  const option = ticketOptionId
    ? options.find((item) => item.id === ticketOptionId)
    : options[0];

  return {
    option,
    invalid: Boolean(ticketOptionId && !option),
    amount: normalizePrice(option?.price ?? fallbackPrice),
  };
}

export function getStudyInvoiceExpectedPrice(
  payload: Record<string, unknown>,
  fallbackPrice: unknown,
) {
  if (
    String(payload.source || "") === "STUDY" &&
    String(payload.ticketOptionId || "")
  ) {
    return normalizePrice(payload.ticketPrice);
  }
  return normalizePrice(fallbackPrice);
}
