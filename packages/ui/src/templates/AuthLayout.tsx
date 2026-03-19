import { ReactNode } from "react";

export interface AuthLayoutProps {
    children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <main className="min-h-screen bg-[#F8F9FE] flex items-center justify-center p-6 font-sans">
            <div className="max-w-md w-full bg-white rounded-[24px] shadow-sm border border-slate-100 p-10">
                {children}
            </div>
        </main>
    );
}
