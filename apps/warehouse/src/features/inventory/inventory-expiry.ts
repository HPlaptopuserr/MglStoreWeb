export function getInventoryExpiry(value: string | null, now = new Date()) {
  if (!value)
    return { days: null, label: "Огноо бүртгээгүй", tone: "neutral" as const };
  const expiry = Date.parse(value.slice(0, 10));
  if (!Number.isFinite(expiry))
    return { days: null, label: "Огноо буруу байна", tone: "neutral" as const };
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) =>
    parts.find((entry) => entry.type === type)?.value;
  const today = Date.parse(`${part("year")}-${part("month")}-${part("day")}`);
  const days = Math.round((expiry - today) / 86400000);
  if (days < 0)
    return {
      days,
      label: `${Math.abs(days)} хоногийн өмнө дууссан`,
      tone: "danger" as const,
    };
  if (days === 0)
    return { days, label: "Өнөөдөр дуусна", tone: "warning" as const };
  return {
    days,
    label: `${days} хоног үлдсэн`,
    tone: days <= 30 ? ("warning" as const) : ("healthy" as const),
  };
}
export function getInventoryBarcodes(
  primary: string | null,
  aliases: string[] = [],
) {
  return [
    ...new Set(
      [primary, ...aliases]
        .map((code) => code?.trim())
        .filter((code): code is string => Boolean(code)),
    ),
  ];
}
