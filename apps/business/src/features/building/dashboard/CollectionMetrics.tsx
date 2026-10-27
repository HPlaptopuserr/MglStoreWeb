import Link from "next/link";
import { currency, type DashboardData } from "./model";
export function CollectionMetrics({ data }: { data: DashboardData }) {
  const metrics = [
    {
      label: "Гэрээ / захиалгын бүртгэл",
      value: String(data.finance.reservations),
      href: "/building/manage/customers",
      note: "Санхүүгийн тооцоонд хамрагдсан",
    },
    {
      label: "Энэ сарын төлөх хуваарь",
      value: currency(data.finance.due),
      href: "/building/manage/payments",
      note: "Хуваарийн нийт дүн",
    },
    {
      label: "Сарын хуваариас төлөгдсөн",
      value: currency(data.finance.monthPaid),
      href: "/building/manage/payments",
      note: "Төлөгдсөн төлөвтэй хуваарь",
    },
    {
      label: "Хугацаа хэтэрсэн",
      value: currency(data.finance.overdue),
      href: "/building/manage/overdue",
      note: `${data.overdue.length} төлөх хуваарь`,
    },
  ];
  return (
    <div className="erp-collection-metrics">
      {metrics.map((metric) => (
        <Link className="erp-card" key={metric.label} href={metric.href}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          <small>{metric.note} ↗</small>
        </Link>
      ))}
    </div>
  );
}
