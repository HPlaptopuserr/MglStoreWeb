import { Sparkles } from "lucide-react";
import {
  ClearButton,
  OrderBadge,
  SelectedItems,
} from "./FeaturedProductsSection";
import { HOMEPAGE_FEATURED_ORGANIZATIONS_LIMIT } from "./product-development.model";

export type FeaturedOrganization = {
  id: string;
  name: string;
  productCount: number;
};

type FeaturedOrganizationsSectionProps = {
  organizations: FeaturedOrganization[];
  selectedOrganizations: FeaturedOrganization[];
  selectedIds: string[];
  onToggle: (organizationId: string) => void;
  onClear: () => void;
};

export function FeaturedOrganizationsSection({
  organizations,
  selectedOrganizations,
  selectedIds,
  onToggle,
  onClear,
}: FeaturedOrganizationsSectionProps) {
  return (
    <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm ring-4 ring-emerald-50">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-700">
            <Sparkles className="h-4 w-4" /> Онцлох байгууллагууд
          </div>
          <h3 className="mt-3 text-lg font-black text-slate-950">
            Нүүр хуудасны эхний байгууллагууд
          </h3>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
            {HOMEPAGE_FEATURED_ORGANIZATIONS_LIMIT} хүртэл байгууллага сонгоно.
            Бараанууд нь бүтээгдэхүүний pin-ийн дараа байгууллага бүрээс ээлжлэн
            харагдана.
          </p>
        </div>
        <ClearButton disabled={selectedIds.length === 0} onClick={onClear} />
      </div>

      {selectedOrganizations.length > 0 && (
        <SelectedItems
          items={selectedOrganizations.map(({ id, name }) => ({
            id,
            label: name,
          }))}
        />
      )}

      <div className="grid max-h-[360px] gap-2 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3 md:grid-cols-2">
        {organizations.map((organization) => {
          const selectedIndex = selectedIds.indexOf(organization.id);
          const selected = selectedIndex >= 0;
          return (
            <button
              key={organization.id}
              type="button"
              onClick={() => onToggle(organization.id)}
              disabled={
                !selected &&
                selectedIds.length >= HOMEPAGE_FEATURED_ORGANIZATIONS_LIMIT
              }
              className={`flex items-center gap-3 rounded-xl border bg-white p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${selected ? "border-emerald-300 ring-2 ring-emerald-100" : "border-slate-100 hover:border-slate-200"}`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-800">
                  {organization.name}
                </p>
                <p className="text-xs font-semibold text-slate-400">
                  {organization.productCount} бараа
                </p>
              </div>
              {selected && <OrderBadge index={selectedIndex} color="emerald" />}
            </button>
          );
        })}
      </div>
    </section>
  );
}
