const CYRILLIC_MAP: Record<string, string> = {
  А: "A", Б: "B", В: "V", Г: "G", Д: "D", Е: "E", Ё: "YO",
  Ж: "J", З: "Z", И: "I", Й: "I", К: "K", Л: "L", М: "M",
  Н: "N", О: "O", Ө: "O", П: "P", Р: "R", С: "S", Т: "T",
  У: "U", Ү: "U", Ф: "F", Х: "H", Ц: "TS", Ч: "CH", Ш: "SH",
  Щ: "SH", Ъ: "", Ы: "Y", Ь: "", Э: "E", Ю: "YU", Я: "YA",
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo",
  ж: "j", з: "z", и: "i", й: "i", к: "k", л: "l", м: "m",
  н: "n", о: "o", ө: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ү: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh",
  щ: "sh", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function isCyrillic(text: string): boolean {
  return /[а-яА-ЯөүӨҮёЁ]/.test(text);
}

function transliterate(text: string): string {
  if (!isCyrillic(text)) return text;
  return text.split("").map((ch) => CYRILLIC_MAP[ch] ?? ch).join("");
}

export function abbreviate(text: string): string {
  if (!text.trim()) return "XXX";
  const latin = transliterate(text).replace(/[^a-zA-Z0-9\s]/g, " ").trim();
  if (!latin) return "XXX";
  const words = latin.trim().split(/\s+/).filter((w) => w.length > 0);

  if (words.length >= 3) {
    return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
  }
  if (words.length === 2) {
    const c1 = removeVowels(words[0]);
    const c2 = removeVowels(words[1]);
    if (c1.length >= 2) return (c1.slice(0, 2) + (c2[0] || words[1][0])).toUpperCase();
    return (words[0][0] + (c1[1] || words[0][1] || "") + words[1][0]).toUpperCase().padEnd(3, "X");
  }
  const word = words[0];
  const consonants = removeVowels(word);
  if (consonants.length >= 3) return consonants.slice(0, 3).toUpperCase();
  const result = word[0] + consonants.replace(word[0].toLowerCase(), "").replace(word[0].toUpperCase(), "");
  if (result.length >= 3) return result.slice(0, 3).toUpperCase();
  return word.slice(0, 3).toUpperCase().padEnd(3, "X");
}

function removeVowels(str: string): string {
  return str.replace(/[aeiouAEIOU]/g, "");
}

export function nextNum(skus: readonly { sku: string | null }[]): string {
  if (skus.length === 0) return "001";
  const nums = skus.map((s) => {
    const parts = (s.sku || "").split("-");
    return parts.length === 3 ? parseInt(parts[2]) || 0 : 0;
  }).sort((a, b) => a - b);
  return (nums[nums.length - 1] + 1).toString().padStart(3, "0");
}

export function skuPrefix(productName: string, organizationName: string): string {
  return `${abbreviate(productName)}-${abbreviate(organizationName)}`;
}
