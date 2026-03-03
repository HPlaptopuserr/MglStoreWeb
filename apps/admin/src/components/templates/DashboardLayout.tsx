import { ReactNode } from "react";
import { Sidebar, SidebarProps } from "../organisms/Sidebar";

export interface DashboardLayoutProps extends SidebarProps {
    children: ReactNode;
}

export function DashboardLayout({ children, ...sidebarProps }: DashboardLayoutProps) {
    return (
        <div className="flex min-h-screen bg-[#F8F9FE] font-sans">
            <Sidebar {...sidebarProps} />
            <main className="flex-1 overflow-x-hidden p-10">
                <div className="max-w-6xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
