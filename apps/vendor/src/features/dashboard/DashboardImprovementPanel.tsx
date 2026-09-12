import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Megaphone,
  PackageX,
  Truck,
  type LucideIcon,
} from "lucide-react";

interface DashboardImprovementMetrics {
  inactiveProducts: number;
  inactiveServicePosts: number;
  pendingPayments: number;
  pendingStockRequests: number;
  urgentExpiryProducts: number;
}

interface ImprovementItem {
  id: string;
  title: string;
  description: string;
  href: string;
  action: string;
  icon: LucideIcon;
  priority: "high" | "medium" | "low";
}

const PRIORITY_STYLE: Record<ImprovementItem["priority"], string> = {
  high: "border-red-100 bg-red-50 text-red-600",
  medium: "border-amber-100 bg-amber-50 text-amber-600",
  low: "border-blue-100 bg-blue-50 text-blue-600",
};

function buildImprovementItems(
  metrics: DashboardImprovementMetrics,
): ImprovementItem[] {
  const items: ImprovementItem[] = [];

  if (metrics.pendingPayments > 0) {
    items.push({
      id: "payments",
      title: `${metrics.pendingPayments} төлбөр хүлээгдэж байна`,
      description:
        "Үлдэгдэл төлбөрүүдээ шалгаж, хугацаа хэтрэхээс өмнө шийднэ үү.",
      href: "/shipments",
      action: "Төлбөр шалгах",
      icon: CircleDollarSign,
      priority: "high",
    });
  }

  if (metrics.urgentExpiryProducts > 0) {
    items.push({
      id: "expiry",
      title: `${metrics.urgentExpiryProducts} барааны хугацаа ойртсон`,
      description:
        "Эдгээр барааг түрүүлж борлуулах эсвэл үлдэгдлийг зохицуулна уу.",
      href: "/products",
      action: "Бараа харах",
      icon: AlertTriangle,
      priority: "high",
    });
  }

  if (metrics.inactiveProducts > 0) {
    items.push({
      id: "products",
      title: `${metrics.inactiveProducts} идэвхгүй бүтээгдэхүүн байна`,
      description:
        "Мэдээлэл, үнэ болон нөөцийг шалгаад худалдаанд гаргах эсэхээ шийднэ үү.",
      href: "/products",
      action: "Сайжруулах",
      icon: PackageX,
      priority: "medium",
    });
  }

  if (metrics.pendingStockRequests > 0) {
    items.push({
      id: "stock-requests",
      title: `${metrics.pendingStockRequests} хүсэлт шийдэгдээгүй`,
      description:
        "Нийлүүлэлтийн хүсэлтийн явц болон дараагийн алхмыг шалгана уу.",
      href: "/shipments",
      action: "Явц харах",
      icon: Truck,
      priority: "low",
    });
  }

  if (metrics.inactiveServicePosts > 0) {
    items.push({
      id: "service-posts",
      title: `${metrics.inactiveServicePosts} идэвхгүй зар байна`,
      description:
        "Хуучирсан мэдээллээ шинэчлэх эсвэл шаардлагатай зараа идэвхжүүлнэ үү.",
      href: "/service-posts",
      action: "Зар засах",
      icon: Megaphone,
      priority: "low",
    });
  }

  return items;
}

export function DashboardImprovementPanel({
  metrics,
}: {
  metrics: DashboardImprovementMetrics;
}) {
  const items = buildImprovementItems(metrics);

  return (
    <section
      data-tour="improvement-panel"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
            <ClipboardCheck size={19} />
          </span>
          <div>
            <h2 className="font-bold text-slate-900">Анхаарах зүйлс</h2>
            <p className="text-xs text-slate-500">
              Одоогийн мэдээлэлд үндэслэсэн сайжруулах ажлууд
            </p>
          </div>
        </div>
        {items.length > 0 && (
          <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
            {items.length} ажил байна
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex items-start gap-3 px-5 py-5">
          <CheckCircle2
            className="mt-0.5 shrink-0 text-emerald-500"
            size={21}
          />
          <div>
            <p className="text-sm font-bold text-slate-800">
              Яаралтай сайжруулах зүйл алга
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Бүтээгдэхүүн, төлбөр болон хүсэлтүүд хэвийн байна.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-px bg-slate-100 sm:grid-cols-2">
          {items.slice(0, 4).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className="group flex min-w-0 items-start gap-3 bg-white p-4 transition hover:bg-slate-50 sm:p-5"
              >
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${PRIORITY_STYLE[item.priority]}`}
                >
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-800">
                    {item.title}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {item.description}
                  </span>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-600">
                    {item.action}
                    <ArrowRight
                      size={13}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
