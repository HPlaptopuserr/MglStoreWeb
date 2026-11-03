const labels: Record<string, string> = {
  DRAFT: "Ноорог",
  PUBLISHED: "Нийтэлсэн",
  PAUSED: "Түр зогсоосон",
  AVAILABLE: "Боломжтой",
  RESERVED: "Захиалгатай",
  SOLD: "Зарагдсан",
  HOLD: "Түр түгжсэн",
  CONTRACT_PENDING: "Гэрээ хүлээж буй",
  CANCELLED: "Цуцалсан",
};
export function ProjectStatus({ status }: { status: string }) {
  return (
    <span className={`management-status status-${status.toLowerCase()}`}>
      <i aria-hidden="true" />
      {labels[status] ?? status}
    </span>
  );
}
