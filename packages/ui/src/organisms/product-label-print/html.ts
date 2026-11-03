export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatPriceMarkup(value: string): string {
  const match = value.trim().match(/^(\d+(?:\.\d{1,2})?)\s*₮$/);
  if (!match) return escapeHtml(value);
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return escapeHtml(value);
  const formatted = new Intl.NumberFormat("mn-MN", {
    maximumFractionDigits: 2,
  }).format(amount);
  return `${escapeHtml(formatted)}<span class="price-currency">₮</span>`;
}
