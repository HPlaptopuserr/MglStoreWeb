"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, Package, Info, CheckCircle, XCircle } from "lucide-react";
import { API, authFetch } from "@/lib/api";

type StockAlertResponse = {
  summary?: {
    lowStockItems?: number;
  };
  items?: Array<{
    id: string;
    quantity: number;
    alertThreshold: number;
    isLowStock: boolean;
    product: {
      name: string;
    };
  }>;
};

type NotificationItem = {
  id: string;
  type: "warning" | "success" | "error" | "info";
  title: string;
  message: string;
  time: Date;
  link?: string;
  read: boolean;
};

function getRelativeTime(date: Date) {
  const diffInSeconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "Дөнгөж сая";
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} минутын өмнө`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} цагийн өмнө`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Өчигдөр";
  if (diffInDays < 30) return `${diffInDays} өдрийн өмнө`;
  
  return date.toLocaleDateString("mn-MN");
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem("vendor_user") || "{}");
        if (!storedUser.organizationId) return;

        const notifs: NotificationItem[] = [];

        // 1. Low stock alerts
        const response = await authFetch(
          `${API}/stock-requests/catalog/organization/${storedUser.organizationId}`,
        );
        if (response.ok) {
          const data: StockAlertResponse = await response.json();
          const lowStockItems = (data.items || []).filter((item) => item.isLowStock);
          
          if (lowStockItems.length > 0) {
            notifs.push({
              id: "low-stock",
              type: "warning",
              title: "Үлдэгдэл багассан",
              message: `${lowStockItems.length} барааны үлдэгдэл босго хэмжээнээс багассан байна.`,
              time: new Date(),
              link: "/shipments",
              read: false,
            });
          }
        }

        // 2. Recent stock requests status updates
        const reqsResponse = await authFetch(
          `${API}/stock-requests?organizationId=${storedUser.organizationId}`,
        );
        if (reqsResponse.ok) {
          const requests = await reqsResponse.json();
          const recentRequests = requests
            .filter((r: any) => r.status !== "PENDING")
            .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 5); // top 5 recent updates

          recentRequests.forEach((req: any) => {
            let statusText = "Шинэчлэгдлээ";
            if (req.status === "APPROVED") statusText = "Зөвшөөрөгдсөн";
            if (req.status === "REJECTED") statusText = "Татгалзсан";
            if (req.status === "PROCESSING") statusText = "Боловсруулж байна";
            if (req.status === "COMPLETED") statusText = "Амжилттай дууссан";

            notifs.push({
              id: `req-${req.id}`,
              type: req.status === "REJECTED" ? "error" : req.status === "COMPLETED" ? "success" : "info",
              title: `Захиалгын төлөв: ${statusText}`,
              message: `${req.requestNumber} дугаартай бараа татах хүсэлт ${statusText.toLowerCase()}.`,
              time: new Date(req.updatedAt),
              link: "/requests",
              read: false,
            });
          });
        }

        // Sort by time descending
        notifs.sort((a, b) => b.time.getTime() - a.time.getTime());
        setNotifications(notifs);
      } catch (error) {
        console.error("Failed to load notifications:", error);
      }
    };

    loadAlerts();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = (notif: NotificationItem) => {
    setIsOpen(false);
    
    // Mark as read locally
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <Package className="h-5 w-5 text-[#FFAD02]" />;
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 group"
      >
        <Bell
          className={`h-4 w-4 transition-colors ${
            unreadCount > 0
              ? "text-[#FFAD02]"
              : "text-slate-400 group-hover:text-[#FFAD02]"
          }`}
        />
        {unreadCount > 0 && (
          <>
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm z-10">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
            <span className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full bg-red-400 animate-ping opacity-75" />
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 overflow-hidden flex flex-col max-h-[85vh]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/50">
            <h3 className="font-bold text-slate-800">Мэдэгдэл</h3>
            {unreadCount > 0 && (
              <span className="rounded-full bg-[#FFAD02]/10 px-2 py-0.5 text-xs font-semibold text-[#FFAD02]">
                {unreadCount} шинэ
              </span>
            )}
          </div>
          
          <div className="overflow-y-auto flex-1 p-2">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="h-8 w-8 text-slate-200 mb-2" />
                <p className="text-sm font-medium text-slate-500">Шинэ мэдэгдэл алга</p>
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-slate-50 ${
                      !notif.read ? "bg-[#FFAD02]/5" : ""
                    }`}
                  >
                    <div className="mt-0.5 shrink-0 rounded-full bg-white p-1.5 shadow-sm ring-1 ring-slate-100">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${!notif.read ? "text-slate-900" : "text-slate-700"}`}>
                        {notif.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                      <p className="mt-1.5 text-[10px] font-medium text-slate-400">
                        {getRelativeTime(notif.time)}
                      </p>
                    </div>
                    {!notif.read && (
                      <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#FFAD02]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="border-t border-slate-100 p-2 bg-slate-50/50">
              <button
                onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                className="w-full rounded-lg py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Бүгдийг уншсан болгох
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
