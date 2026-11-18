import { transliterateLatinTokenToCyrillic } from "./product-discovery";

const cyrillicLetters: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "j",
  з: "z",
  и: "i",
  й: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  ө: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ү: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ъ: "",
  ы: "i",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};
const spokenLetters: Record<string, string> = {
  эй: "a",
  би: "b",
  си: "c",
  ди: "d",
  и: "e",
  эф: "f",
  жи: "g",
  эйч: "h",
  ай: "i",
  жэй: "j",
  кей: "k",
  эл: "l",
  эм: "m",
  эн: "n",
  о: "o",
  пи: "p",
  кью: "q",
  ар: "r",
  эс: "s",
  ти: "t",
  ю: "u",
  ви: "v",
  даблью: "w",
  экс: "x",
  уай: "y",
  зэд: "z",
};
function latinText(value: string): string {
  return Array.from(value, (letter) => cyrillicLetters[letter] ?? letter)
    .join("")
    .replace(/kh/g, "h")
    .replace(/zh/g, "j")
    .replace(/ck/g, "k");
}

/** Bounded spelling alternatives, shared by public directory SQL and featured listings. */
export function getClubSearchVariants(value: string): string[] {
  const original = value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!original) return [];
  const latin = latinText(original);
  const variants = new Set([original, latin]);
  if (latin.includes("k")) variants.add(latin.replace(/k/g, "ck"));
  if (latin.includes("v")) variants.add(latin.replace(/v/g, "w"));
  const words = original.split(" ");
  if (words.length > 1 && words.every((word) => spokenLetters[word]))
    variants.add(words.map((word) => spokenLetters[word]).join(""));
  const cyrillicPhrase = latin
    .split(" ")
    .map((word) => transliterateLatinTokenToCyrillic(word)[0] || word)
    .join(" ");
  variants.add(cyrillicPhrase);
  // Expand complete phrases, keeping word order instead of matching any one word.
  let phrases = [""];
  for (const word of latin.split(" ")) {
    const alternatives = [word, ...transliterateLatinTokenToCyrillic(word)];
    phrases = phrases
      .flatMap((prefix) =>
        alternatives.map((alternative) => `${prefix} ${alternative}`.trim()),
      )
      .slice(0, 16);
  }
  for (const phrase of phrases) variants.add(phrase);
  return [...variants].slice(0, 20);
}

export function matchesClubSearch(text: string, query: string): boolean {
  const queries = getClubSearchVariants(query);
  if (!queries.length) return true;
  const normalized = text.normalize("NFKC").toLowerCase().replace(/\s+/g, " ");
  const searchable = [normalized, latinText(normalized)];
  return queries.some((variant) =>
    searchable.some((value) => value.includes(variant)),
  );
}
