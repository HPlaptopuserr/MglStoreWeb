export function memberDisplayName(value: string) {
  return value.replace(/^\[ТЕСТ\]\s*/u, "").trim();
}

export function memberServiceTags(offers: string) {
  return [
    ...new Set(
      offers
        .split(/[,;\n]+/u)
        .map((offer) => offer.trim())
        .filter(Boolean),
    ),
  ];
}
