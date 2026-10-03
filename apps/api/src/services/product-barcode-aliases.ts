export function parseBarcodeAliases(input: unknown): string[] | null {
  if (
    !Array.isArray(input) ||
    input.length === 0 ||
    input.length > 20 ||
    !input.every(
      (code: unknown) =>
        typeof code === "string" &&
        code.trim().length > 0 &&
        code.trim().length <= 100 &&
        !/\s/.test(code.trim()),
    )
  )
    return null;
  return [...new Set((input as string[]).map((code) => code.trim()))];
}
export function mergeBarcodeAliases(
  primary: string | null,
  current: string[],
  incoming: string[],
) {
  const aliases = [...new Set([...current, ...incoming])].filter(
    (code) => code !== primary,
  );
  if (aliases.length > 20)
    throw new Error("Нэг бараанд 20 хүртэл нэмэлт баркод холбоно.");
  return aliases;
}
