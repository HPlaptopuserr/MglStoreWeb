"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutGrid,
    Users,
    Layers,
    Settings,
    LogOut,
    ShieldCheck,
    ChevronLeft,
    ChevronRight
} from "lucide-react";

export interface NavItem {
    id: string;
    label: string;
    icon: React.ElementType;
    href: string;
    isActive?: boolean;
}

export interface SidebarProps {
    userName?: string;
    userRole?: string;
    userInitials?: string;
    onSignOut?: () => void;
    navItems?: NavItem[];
}

export function Sidebar({
    userName = "Admin User",
    userRole = "ADMIN",
    userInitials = "AD",
    onSignOut,
    navItems,
}: SidebarProps) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const defaultNavItems: NavItem[] = [
        { id: "dashboard", label: "Хяналтын самбар", icon: LayoutGrid, href: "/dashboard" },
        { id: "requests", label: "Хүсэлтүүд", icon: Users, href: "/requests" },
        { id: "sections", label: "Сайтын хэсгүүд", icon: Layers, href: "/sections" },
        { id: "settings", label: "Тохиргоо", icon: Settings, href: "/settings" },
    ];

    const items = navItems || defaultNavItems;

    return (
        <aside className={`${isCollapsed ? "w-[88px]" : "w-[260px]"} bg-white border-r border-slate-100 flex flex-col pt-8 pb-6 px-4 shrink-0 shadow-[2px_0_8px_rgba(0,0,0,0.02)] transition-all duration-300 relative`}>
            {/* Toggle Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-9 bg-white border border-slate-200 rounded-full p-1 text-slate-400 hover:text-[#5B4CFF] shadow-sm z-10 hidden md:flex"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Logo */}
            <div className={`flex items-center gap-3 mb-10 ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}>
                <div className="bg-[#5B4CFF] text-white p-2 rounded-xl shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                </div>
                {!isCollapsed && <span className="text-xl font-bold text-slate-800 whitespace-nowrap overflow-hidden transition-opacity duration-300">Marrow</span>}
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-2">
                {items.map((item) => {
                    const Icon = item.icon;
                    // Automatically determine if the current path matches the href (exact match for root /dashboard, startsWith for subpages)
                    const isActive = item.isActive !== undefined
                        ? item.isActive
                        : (item.href === "/dashboard" ? pathname === "/dashboard" : pathname?.startsWith(item.href));

                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            title={isCollapsed ? item.label : undefined}
                            className={`w-full flex items-center gap-3 py-3 rounded-2xl transition-all ${isCollapsed ? 'justify-center px-0' : 'px-4'
                                } ${isActive
                                    ? "bg-[#5B4CFF]/10 text-[#5B4CFF] font-semibold"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium"
                                }`}
                        >
                            <Icon className="w-5 h-5 shrink-0" />
                            {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* User Profile Component placed at bottom */}
            <div className="mt-auto">
                <div className={`bg-[#F8F9FE] rounded-2xl flex flex-col gap-4 transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-4'}`}>
                    <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                        <div className="w-10 h-10 rounded-full bg-green-200 text-green-700 flex items-center justify-center font-bold text-sm shrink-0">
                            {userInitials}
                        </div>
                        {!isCollapsed && (
                            <div className="overflow-hidden">
                                <div className="font-semibold text-slate-800 text-sm truncate">{userName}</div>
                                <div className="text-xs text-slate-400 font-medium uppercase">{userRole}</div>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onSignOut}
                        title={isCollapsed ? "Гарах" : undefined}
                        className={`flex items-center text-red-500 font-semibold text-sm hover:text-red-600 transition-colors w-full ${isCollapsed ? 'justify-center' : 'gap-2'}`}
                    >
                        <LogOut className={`w-4 h-4 shrink-0 ${isCollapsed ? '' : 'ml-1'}`} />
                        {!isCollapsed && <span className="whitespace-nowrap">Sign Out</span>}
                    </button>
                </div>
            </div>
        </aside>
    );
}
