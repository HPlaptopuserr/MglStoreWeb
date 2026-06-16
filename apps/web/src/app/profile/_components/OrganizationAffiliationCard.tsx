"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronRight,
  RefreshCcw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { resolveApiAssetUrl } from "@/lib/api";
import type { AuthOrganization, AuthUser } from "@/lib/auth-context";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";

const roleLabel: Record<string, string> = {
  OWNER: "Эзэмшигч",
  ADMIN: "Админ",
  STAFF: "Ажилтан",
  VIEWER: "Ажиглагч",
};

function getOrganizations(user: AuthUser): AuthOrganization[] {
  if (Array.isArray(user.organizations) && user.organizations.length > 0) {
    return user.organizations;
  }

  if (!user.organizationId || !user.orgRole) return [];

  return [
    {
      id: user.organizationId,
      name: user.organizationName || "Байгууллага",
      role: user.orgRole,
      isPrimary: true,
    },
  ];
}

function getInitials(name?: string | null) {
  return (name || "ORG")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function OrganizationAffiliationCard({
  onOpenOrganization,
  user,
}: {
  onOpenOrganization: (organizationId: string) => void;
  user: AuthUser;
}) {
  const organizations = getOrganizations(user);
  const [allProfilesOpen, setAllProfilesOpen] = useState(false);
  if (!organizations.length) return null;

  const displayName =
    user.fullName || user.email || user.phone || "Personal account";
  const featuredOrganizations = organizations.slice(0, 2);
  const showAllProfilesButton =
    organizations.length > featuredOrganizations.length;

  const openOrganization = (organizationId: string) => {
    setAllProfilesOpen(false);
    onOpenOrganization(organizationId);
  };

  return (
    <>
      <section className="w-full min-w-0 overflow-hidden rounded-[20px] border border-white/10 bg-[#1f2422]/85 p-3 text-white shadow-[0_14px_44px_rgba(0,0,0,0.16)] backdrop-blur-xl sm:rounded-[22px] sm:shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
        <div className="flex items-center gap-3 px-1 py-0.5">
          <Avatar label={displayName} src={user.avatarUrl} compact />
          <div className="min-w-0">
            <p className="truncate text-base font-black tracking-tight text-white">
              {displayName}
            </p>
            <p className="text-[11px] font-bold text-white/45">
              Personal profile
            </p>
          </div>
        </div>

        <div className="my-2.5 h-px bg-white/20" />

        <div className="space-y-2 overflow-hidden">
          {featuredOrganizations.map((org) => (
            <OrganizationRow
              key={org.id}
              organization={org}
              onClick={() => openOrganization(org.id)}
            />
          ))}
        </div>

        {showAllProfilesButton && (
          <button
            type="button"
            onClick={() => setAllProfilesOpen(true)}
            className="mt-2.5 flex h-10 w-full items-center justify-center gap-2 rounded-[14px] bg-white/10 px-3 text-sm font-black text-white/85 transition hover:bg-white/15"
          >
            <RefreshCcw size={17} />
            Бүх profile харах ({organizations.length})
          </button>
        )}
      </section>

      {allProfilesOpen && (
        <OrganizationSwitcherModal
          displayName={displayName}
          onClose={() => setAllProfilesOpen(false)}
          onOpenOrganization={openOrganization}
          organizations={organizations}
          user={user}
        />
      )}
    </>
  );
}

function OrganizationSwitcherModal({
  displayName,
  onClose,
  onOpenOrganization,
  organizations,
  user,
}: {
  displayName: string;
  onClose: () => void;
  onOpenOrganization: (organizationId: string) => void;
  organizations: AuthOrganization[];
  user: AuthUser;
}) {
  useLockBodyScroll();

  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOrganizations = useMemo(() => {
    if (!normalizedQuery) return organizations;

    return organizations.filter((org) => {
      const haystack =
        `${org.name} ${org.slug || ""} ${org.role}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery, organizations]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center overflow-hidden overscroll-none bg-slate-950/65 px-3 pb-3 pt-12 backdrop-blur-sm sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close account switcher"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative flex max-h-[82vh] w-full max-w-xl flex-col overflow-hidden overscroll-contain rounded-[28px] border border-white/10 bg-[#202322] text-white shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">
              Account switcher
            </p>
            <h2 className="mt-1 truncate text-xl font-black text-white">
              Profile сонгох
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/15 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="flex items-center gap-3 rounded-[18px] bg-white/10 px-3 py-3">
            <Avatar label={displayName} src={user.avatarUrl} compact />
            <div className="min-w-0">
              <p className="truncate text-base font-black">{displayName}</p>
              <p className="text-xs font-bold text-white/45">
                Personal profile
              </p>
            </div>
          </div>

          <label className="flex h-12 items-center gap-2 rounded-[16px] border border-white/10 bg-white px-3 text-slate-950">
            <Search size={18} className="text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Байгууллага хайх..."
              className="h-full min-w-0 flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-slate-400"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
            <span>All organizations</span>
            <span>
              {filteredOrganizations.length}/{organizations.length}
            </span>
          </div>
          <div className="space-y-2">
            {filteredOrganizations.map((org) => (
              <OrganizationRow
                key={org.id}
                organization={org}
                onClick={() => onOpenOrganization(org.id)}
                spacious
              />
            ))}

            {!filteredOrganizations.length && (
              <div className="rounded-[18px] border border-white/10 bg-white/10 px-4 py-8 text-center">
                <p className="text-sm font-black text-white">Илэрц олдсонгүй</p>
                <p className="mt-1 text-xs font-bold text-white/45">
                  Нэр, slug эсвэл role-оор дахин хайна уу.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrganizationRow({
  onClick,
  organization,
  spacious,
}: {
  onClick: () => void;
  organization: AuthOrganization;
  spacious?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full min-w-0 items-center gap-2.5 overflow-hidden rounded-[16px] bg-white/10 px-3 text-left transition hover:-translate-y-0.5 hover:bg-white/15 ${
        spacious ? "py-3.5" : "py-2.5"
      }`}
    >
      <Avatar label={organization.name} src={organization.logoUrl} compact />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-black text-white sm:text-base">
            {organization.name}
          </p>
          {organization.isPrimary && (
            <span className="shrink-0 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-100 ring-1 ring-emerald-300/20 sm:text-[10px]">
              PRI
            </span>
          )}
        </div>
        <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] font-bold text-white/50 sm:text-xs">
          <ShieldCheck size={12} className="shrink-0" />
          <span className="min-w-0 truncate">
            {roleLabel[organization.role] || organization.role}
            {organization.slug ? ` · @${organization.slug}` : ""}
          </span>
        </p>
      </div>
      <ChevronRight size={17} className="shrink-0 text-white/45" />
    </button>
  );
}

function Avatar({
  compact,
  label,
  src,
}: {
  compact?: boolean;
  label: string;
  src?: string | null;
}) {
  const size = compact
    ? "h-11 w-11 text-sm sm:h-12 sm:w-12"
    : "h-14 w-14 text-base";
  const [failed, setFailed] = useState(false);
  const imageSrc = src && !failed ? resolveApiAssetUrl(src) : "";

  if (imageSrc) {
    return (
      <span
        className={`${size} shrink-0 overflow-hidden rounded-full bg-white/10`}
      >
        <img
          src={imageSrc}
          alt=""
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-white/12 font-black text-white ring-1 ring-white/10`}
    >
      {compact ? <Building2 size={20} /> : getInitials(label)}
    </span>
  );
}
