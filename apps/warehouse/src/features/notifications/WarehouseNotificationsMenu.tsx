"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  Clock3,
  Loader2,
  PackageCheck,
  PackageX,
  X,
} from "lucide-react";
import { useWarehouseNotifications } from "./useWarehouseNotifications";
import type { WarehouseNotification } from "./warehouse-notification.types";

function NotificationIcon({ notification }: { notification: WarehouseNotification }) {
  const className =
    notification.severity === "critical"
      ? "bg-red-50 text-red-600"
      : notification.severity === "warning"
        ? "bg-amber-50 text-amber-600"
        : "bg-blue-50 text-blue-600";
  const Icon =
    notification.type === "ONLINE_ORDER"
      ? PackageCheck
      : notification.type === "OUT_OF_STOCK"
      ? PackageX
      : notification.type === "EXPIRING"
        ? Clock3
        : AlertTriangle;
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${className}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}

export function WarehouseNotificationsMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    notifications,
    unreadCount,
    loading,
    error,
    latestAlert,
    dismissAlert,
    refresh,
    markAllRead,
  } = useWarehouseNotifications();

  useEffect(() => {
    if (!open) return;
    markAllRead();
    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [markAllRead, open]);

  return (
    <div ref={containerRef} className="relative">
      {latestAlert && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed right-5 top-20 z-[100] w-[min(24rem,calc(100vw-2rem))] animate-in slide-in-from-right-6 overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-2xl shadow-slate-900/20 duration-300"
        >
          <div className="h-1 bg-gradient-to-r from-blue-600 to-cyan-400" />
          <div className="flex gap-3 p-4">
            <NotificationIcon notification={latestAlert} />
            <Link
              href={latestAlert.href}
              onClick={dismissAlert}
              className="min-w-0 flex-1"
            >
              <p className="text-xs font-black uppercase tracking-wider text-blue-600">
                Шинэ захиалга
              </p>
              <p className="mt-1 text-sm font-black text-slate-950">
                {latestAlert.message}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {latestAlert.detail}
              </p>
            </Link>
            <button
              type="button"
              onClick={dismissAlert}
              aria-label="Мэдэгдэл хаах"
              className="self-start rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={16} />
            </button>
          </div>
        </aside>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={`Мэдэгдэл${unreadCount ? `, ${unreadCount} шинэ` : ""}`}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="text-sm font-black text-slate-900">Мэдэгдэл</h2>
              <p className="text-[10px] font-semibold text-slate-400">
                Анхаарал шаардах агуулахын мэдээлэл
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700"
            >
              Шинэчлэх
            </button>
          </header>

          <div className="max-h-[28rem] overflow-y-auto p-2">
            {loading ? (
              <div className="flex h-28 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <p className="text-xs font-bold text-red-600">Мэдэгдэл ачаалж чадсангүй</p>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="mt-3 text-xs font-black text-blue-600"
                >
                  Дахин оролдох
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs font-semibold text-slate-400">
                Шинэ мэдэгдэл алга
              </div>
            ) : (
              notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.href}
                  onClick={() => setOpen(false)}
                  className="flex gap-3 rounded-xl p-3 transition hover:bg-slate-50"
                >
                  <NotificationIcon notification={notification} />
                  <span className="min-w-0">
                    <span className="block text-xs font-black text-slate-900">
                      {notification.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-600">
                      {notification.message}
                    </span>
                    <span className="mt-1 block truncate text-[10px] text-slate-400">
                      {notification.detail}
                    </span>
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
