import type { SalesStoreDetailsResponse } from "@/lib/admin-sales-stores-api";
import { StoreInfoGroup, storeDate } from "./StoreInfoGroup";
import { StoreMapLink } from "./StoreMapLink";
export function SalesStoreBranches({
  branches,
  onPage,
}: {
  branches: SalesStoreDetailsResponse["branches"];
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(branches.total / branches.pageSize));
  return (
    <section className="space-y-3">
      <h5 className="text-sm font-bold text-slate-900">
        Салбарууд · {branches.total}
      </h5>
      {branches.items.length ? (
        branches.items.map((branch) => (
          <div
            key={branch.id}
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-3"
          >
            <StoreInfoGroup
              title={branch.name}
              fields={[
                ["Хаяг", branch.address],
                [
                  "Координат",
                  branch.lat !== null && branch.lng !== null
                    ? `${branch.lat}, ${branch.lng}`
                    : null,
                ],
                ["Бүртгэсэн", storeDate(branch.createdAt)],
                ["Шинэчилсэн", storeDate(branch.updatedAt)],
              ]}
            />
            <StoreMapLink latitude={branch.lat} longitude={branch.lng} />
          </div>
        ))
      ) : (
        <p className="text-sm text-slate-500">Салбар бүртгэгдээгүй.</p>
      )}
      {pages > 1 && (
        <nav
          aria-label="Дэлгүүрийн салбарууд"
          className="flex items-center justify-between gap-2 text-sm"
        >
          <button
            type="button"
            disabled={branches.page <= 1}
            onClick={() => onPage(branches.page - 1)}
            className="rounded-lg border p-2 hover:bg-white disabled:opacity-40"
          >
            Өмнөх
          </button>
          <span>
            {branches.page} / {pages}
          </span>
          <button
            type="button"
            disabled={branches.page >= pages}
            onClick={() => onPage(branches.page + 1)}
            className="rounded-lg border p-2 hover:bg-white disabled:opacity-40"
          >
            Дараах
          </button>
        </nav>
      )}
    </section>
  );
}
