import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type BackButtonProps = {
  href?: string;
  label?: string;
  className?: string;
};

export default function BackButton({
  href = "/dashboard",
  label = "Буцах",
  className = "",
}: BackButtonProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 ${className}`}
    >
      <ArrowLeft size={14} />
      {label}
    </Link>
  );
}
