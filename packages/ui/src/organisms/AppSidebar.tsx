"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ElementType, type ReactNode } from "react";
import {
  ChevronDown,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type AppSidebarItem = {
  id: string;
  label: string;
  href: string;
  icon: ElementType;
  isActive?: boolean;
  tone?: "default" | "success" | "warning";
  onClick?: () => void;
  children?: AppSidebarItem[];
};

export type AppSidebarGroup = {
  id: string;
  title: string;
  items: AppSidebarItem[];
};

export interface AppSidebarProps {
  userName: string;
  userRole: string;
  userInitials: string;
  groups: AppSidebarGroup[];
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onSignOut?: () => void;
  bottomSlot?: ReactNode;
  bottomGroups?: AppSidebarGroup[];
  profileHref?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  showDesktopSidebar?: boolean;
  showDesktopSpacer?: boolean;
  className?: string;
}

const EXPANDED_WIDTH = 236;
const COLLAPSED_WIDTH = 68;

function isRouteActive(pathname: string | null, item: AppSidebarItem) {
  if (item.isActive !== undefined) return item.isActive;
  if (!pathname) return false;
  if (item.href === "/dashboard") return pathname === "/dashboard";
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

function isItemOrChildActive(
  pathname: string | null,
  item: AppSidebarItem,
): boolean {
  return (
    isRouteActive(pathname, item) ||
    Boolean(
      item.children?.some((child) => isItemOrChildActive(pathname, child)),
    )
  );
}

function itemToneClasses(item: AppSidebarItem, isActive: boolean) {
  if (item.tone === "success") {
    return isActive
      ? "bg-emerald-50 text-emerald-700"
      : "text-emerald-700 hover:bg-emerald-50";
  }

  if (item.tone === "warning") {
    return isActive
      ? "bg-amber-100 text-amber-800"
      : "text-amber-700 hover:bg-amber-50";
  }

  return isActive
    ? "bg-slate-100 font-semibold text-slate-950"
    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950";
}

function iconToneClasses(item: AppSidebarItem, isActive: boolean) {
  if (item.tone === "success") {
    return isActive ? "text-emerald-600" : "text-emerald-600";
  }

  if (item.tone === "warning") {
    return isActive ? "text-amber-800" : "text-amber-600";
  }

  return isActive
    ? "text-slate-950"
    : "text-slate-500 group-hover:text-slate-900";
}

function parentToneClasses(item: AppSidebarItem, isActive: boolean) {
  if (item.tone === "success") {
    return isActive
      ? "bg-emerald-50/70 text-emerald-700"
      : "text-emerald-700 hover:bg-emerald-50/70";
  }

  if (item.tone === "warning") {
    return isActive
      ? "bg-amber-50 text-amber-800"
      : "text-amber-700 hover:bg-amber-50";
  }

  return isActive
    ? "bg-slate-50 text-slate-950"
    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950";
}

function SidebarContent({
  userName,
  userRole,
  userInitials,
  groups,
  bottomGroups,
  bottomSlot,
  collapsed,
  onCollapsedChange,
  onSignOut,
  profileHref,
}: Omit<
  AppSidebarProps,
  "mobileOpen" | "onMobileClose" | "showDesktopSpacer" | "className"
>) {
  const pathname = usePathname();
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const nextOpenItems: Record<string, boolean> = {};

    groups.concat(bottomGroups ?? []).forEach((group) => {
      group.items.forEach((item) => {
        if (
          item.children?.some((child) => isItemOrChildActive(pathname, child))
        ) {
          nextOpenItems[item.id] = true;
        }
      });
    });

    setOpenItems((current) => {
      const shouldUpdate = Object.entries(nextOpenItems).some(
        ([id, isOpen]) => current[id] !== isOpen,
      );

      return shouldUpdate ? { ...current, ...nextOpenItems } : current;
    });
  }, [bottomGroups, groups, pathname]);

  const renderGroups = (items: AppSidebarGroup[]) =>
    items.map((group) => {
      if (group.items.length === 0) return null;

      return (
        <div key={group.id} className="space-y-1">
          {!collapsed && (
            <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 first:pt-0">
              {group.title}
            </p>
          )}

          {group.items.map((item) => {
            const Icon = item.icon;
            const hasChildren = Boolean(item.children?.length);
            const isActive = isItemOrChildActive(pathname, item);
            const isOpen = openItems[item.id] ?? isActive;

            if (hasChildren) {
              return (
                <div key={item.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (collapsed) {
                        onCollapsedChange(false);
                        setOpenItems({ [item.id]: true });
                        return;
                      }

                      setOpenItems((current) =>
                        (current[item.id] ?? isActive)
                          ? { [item.id]: false }
                          : { [item.id]: true },
                      );
                    }}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "group relative flex h-9 w-full items-center rounded-lg text-[13px] font-semibold transition-all duration-200",
                      collapsed ? "justify-center px-0" : "gap-2.5 px-3",
                      parentToneClasses(item, isActive),
                    )}
                  >
                    {!collapsed && isActive && (
                      <span className="absolute left-1 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-slate-400" />
                    )}
                    <Icon
                      className={cn(
                        "h-[17px] w-[17px] shrink-0",
                        iconToneClasses(item, isActive),
                      )}
                    />
                    {!collapsed && (
                      <>
                        <span className="min-w-0 flex-1 truncate whitespace-nowrap text-left">
                          {item.label}
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform",
                            isOpen && "rotate-180",
                          )}
                        />
                      </>
                    )}
                  </button>

                  {!collapsed && isOpen && (
                    <div className="ml-[20px] space-y-0.5 border-l border-slate-200 pl-2.5">
                      {item.children?.map((child) => {
                        const ChildIcon = child.icon;
                        const isChildActive = isItemOrChildActive(
                          pathname,
                          child,
                        );

                        return (
                          <Link
                            key={child.id}
                            href={child.href}
                            prefetch={false}
                            onClick={child.onClick}
                            className={cn(
                              "group flex h-8 items-center gap-2 rounded-md px-2.5 text-[13px] font-medium transition-all duration-200",
                              itemToneClasses(child, isChildActive),
                            )}
                          >
                            <ChildIcon
                              className={cn(
                                "h-3.5 w-3.5 shrink-0",
                                iconToneClasses(child, isChildActive),
                              )}
                            />
                            <span className="truncate whitespace-nowrap">
                              {child.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                prefetch={false}
                onClick={item.onClick}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group flex h-9 items-center rounded-lg text-[13px] font-medium transition-all duration-200",
                  collapsed ? "justify-center px-0" : "gap-2.5 px-3",
                  itemToneClasses(item, isActive),
                )}
              >
                <Icon
                  className={cn(
                    "h-[17px] w-[17px] shrink-0",
                    iconToneClasses(item, isActive),
                  )}
                />
                {!collapsed && (
                  <span className="truncate whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      );
    });

  const profile = (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center rounded-xl",
        profileHref && "transition hover:bg-slate-50",
        collapsed ? "justify-center p-0" : "gap-2 px-1 py-1",
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
        {userInitials}
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold leading-5 text-slate-900">
            {userName}
          </div>
          <div className="truncate text-[11px] leading-4 text-slate-500">
            {userRole}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div
        className={cn(
          "mb-4 flex items-center",
          collapsed ? "justify-center" : "gap-2",
        )}
      >
        {profileHref ? (
          <Link
            href={profileHref}
            prefetch={false}
            title={collapsed ? "Профайл" : undefined}
            className="min-w-0 flex-1"
          >
            {profile}
          </Link>
        ) : (
          profile
        )}

        {!collapsed && (
          <button
            type="button"
            onClick={() => onCollapsedChange(true)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Sidebar хураах"
            title="Sidebar хураах"
          >
            <ToggleIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={() => onCollapsedChange(false)}
          className="mb-3 flex h-8 w-full items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          aria-label="Sidebar нээх"
          title="Sidebar нээх"
        >
          <ToggleIcon className="h-4 w-4" />
        </button>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden">
        {renderGroups(groups)}
      </nav>

      <div className="mt-auto space-y-1 border-t border-slate-200 pt-3">
        {bottomSlot && !collapsed && <div className="mb-3">{bottomSlot}</div>}
        {bottomGroups && renderGroups(bottomGroups)}
        <button
          onClick={onSignOut}
          title={collapsed ? "Гарах" : undefined}
          className={cn(
            "group flex h-9 w-full items-center rounded-lg text-[13px] font-semibold text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600",
            collapsed ? "justify-center px-0" : "gap-2.5 px-3",
          )}
        >
          <LogOut className="h-[17px] w-[17px] shrink-0" />
          {!collapsed && <span>Гарах</span>}
        </button>
      </div>
    </>
  );
}

export function AppSidebar({
  collapsed,
  showDesktopSidebar = true,
  showDesktopSpacer = true,
  mobileOpen = false,
  onMobileClose,
  className,
  ...contentProps
}: AppSidebarProps) {
  const widthClass = collapsed ? "w-[68px]" : "w-[236px]";

  return (
    <>
      {showDesktopSpacer && (
        <div
          className={cn(
            widthClass,
            "hidden shrink-0 transition-all duration-300 md:block",
          )}
          style={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
        />
      )}

      {showDesktopSidebar && (
        <aside
          className={cn(
            widthClass,
            "fixed left-0 top-0 z-40 hidden h-screen shrink-0 flex-col border-r border-slate-200 bg-white px-2 py-4 text-slate-700 transition-all duration-300 md:flex",
            className,
          )}
        >
          <SidebarContent collapsed={collapsed} {...contentProps} />
        </aside>
      )}

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={onMobileClose}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <aside
            className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-slate-200 bg-white px-2 py-4 text-slate-700 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={onMobileClose}
              className="absolute right-3 top-3 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Sidebar хаах"
              title="Sidebar хаах"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent collapsed={false} {...contentProps} />
          </aside>
        </div>
      )}
    </>
  );
}
