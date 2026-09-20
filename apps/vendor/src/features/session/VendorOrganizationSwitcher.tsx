import {
  canSwitchToOrganization,
  type VendorOrganization,
} from "./vendor-session.model";

interface VendorOrganizationSwitcherProps {
  organizations: VendorOrganization[];
  selectedId: string | null;
  disabled: boolean;
  onChange: (organizationId: string) => void;
}

export function VendorOrganizationSwitcher({
  organizations,
  selectedId,
  disabled,
  onChange,
}: VendorOrganizationSwitcherProps) {
  return (
    <select
      value={selectedId || ""}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 min-w-0 max-w-full truncate rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus-visible:border-blue-500 focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-wait disabled:opacity-60 sm:max-w-[260px]"
      aria-label="Байгууллага солих"
    >
      {!organizations.some((item) => item.id === selectedId) && (
        <option value="" disabled>
          Дэлгүүр сонгох
        </option>
      )}
      {organizations.map((organization) => (
        <option
          key={organization.id}
          value={organization.id}
          disabled={!canSwitchToOrganization(organization)}
        >
          {organization.name}
          {!canSwitchToOrganization(organization) ? " · Идэвхгүй" : ""}
        </option>
      ))}
    </select>
  );
}
