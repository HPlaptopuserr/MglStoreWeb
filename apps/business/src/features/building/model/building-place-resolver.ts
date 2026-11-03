/** Resolve readable URLs without choosing arbitrarily between duplicate labels. */
export function resolveBuildingBlock<T extends { id: string; name: string }>(blocks: T[], segment?: string): T | undefined {
  if (segment === undefined) return undefined;
  let decoded = segment;
  try { decoded = decodeURIComponent(segment); } catch { return undefined; }
  const exact = blocks.filter(block => block.id === decoded || block.name === decoded);
  if (exact.length) return exact.length === 1 ? exact[0] : undefined;
  const aliases: Record<string, string> = { А: "A", В: "B", С: "C", Е: "E", Н: "H", К: "K", М: "M", О: "O", Р: "P", Т: "T", Х: "X" };
  const normalize = (name: string) => name.normalize("NFC").trim().toUpperCase().replace(/[АВСЕНКМОРТХ]/g, character => aliases[character] ?? character);
  const matches = blocks.filter(block => normalize(block.name) === normalize(decoded));
  return matches.length === 1 ? matches[0] : undefined;
}
