import Link from "next/link";
import type { OrganizationPreview } from "../_lib/reels.types";
import { mediaUrl } from "../_lib/reels.utils";
import { OrgAvatar } from "./OrgAvatar";

type OrganizationRailProps = {
  organizations: OrganizationPreview[];
};

export function OrganizationRail({ organizations }: OrganizationRailProps) {
  if (!organizations.length) return null;

  return (
    <aside className="fixed right-4 top-[86px] z-30 hidden w-[250px] overflow-hidden rounded-[28px] bg-black/35 p-3 ring-1 ring-white/10 backdrop-blur-2xl 2xl:block">
      <div className="mb-3 flex items-center justify-between px-1">
        <div>
          <p className="text-sm font-black text-white">Дэлгүүрүүд</p>
          <p className="text-[11px] font-bold text-white/50">
            Shop reel витрин
          </p>
        </div>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-black text-white">
          {organizations.length}
        </span>
      </div>
      <div className="flex max-h-[42dvh] flex-col gap-2 overflow-y-auto scrollbar-hide">
        {organizations.slice(0, 8).map((org) => {
          const row = (
            <>
              <OrgAvatar
                name={org.name}
                logoUrl={mediaUrl(org.logoUrl)}
                sizeClass="h-10 w-10"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-black text-white">
                  {org.name}
                </span>
                <span className="block text-[11px] font-bold text-white/48">
                  {org.count} shop reel
                </span>
              </span>
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-black">
                Дэлгүүр
              </span>
            </>
          );
          const className =
            "flex items-center gap-2 rounded-2xl bg-white/8 p-2 text-left transition hover:bg-white/14";

          if (org.slug) {
            return (
              <Link
                key={org.key}
                href={`/store/${org.slug}`}
                className={className}
              >
                {row}
              </Link>
            );
          }

          return (
            <div key={org.key} className={className}>
              {row}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
