import type { OnlineOrder } from "./online-order.types";

export function OnlineOrderStats({ orders }: { orders: OnlineOrder[] }) {
  const stats = [
    {
      label: "Шинэ",
      value: orders.filter((order) => order.status === "CONFIRMED").length,
      tone: "bg-blue-50 text-blue-700 ring-blue-100",
    },
    {
      label: "Бэлтгэж буй",
      value: orders.filter((order) => order.status === "PREPARING").length,
      tone: "bg-amber-50 text-amber-700 ring-amber-100",
    },
    {
      label: "Бэлэн",
      value: orders.filter((order) => order.status === "PREPARED").length,
      tone: "bg-violet-50 text-violet-700 ring-violet-100",
    },
  ];

  return (
    <section
      aria-label="Захиалгын төлөвийн товч мэдээлэл"
      className="flex flex-wrap items-center gap-2"
    >
      {stats.map((stat) => (
        <span
          key={stat.label}
          className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-bold ring-1 ${stat.tone}`}
        >
          {stat.label}
          <strong className="text-sm font-black tabular-nums">
            {stat.value}
          </strong>
        </span>
      ))}
    </section>
  );
}
