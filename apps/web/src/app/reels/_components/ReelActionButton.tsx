import type { LucideIcon } from "lucide-react";

type ReelActionButtonProps = {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  ariaLabel?: string;
  onClick?: () => void;
};

export function ReelActionButton({
  icon: Icon,
  label,
  active = false,
  ariaLabel,
  onClick,
}: ReelActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`flex w-10 flex-col items-center gap-0.5 drop-shadow-lg transition hover:scale-105 active:scale-95 sm:w-14 sm:gap-1 ${
        active ? "text-red-500" : "text-white"
      }`}
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full ring-1 backdrop-blur-xl sm:h-12 sm:w-12 ${
          active
            ? "bg-white text-red-500 ring-white/40"
            : "bg-black/32 ring-white/10"
        }`}
      >
        <Icon
          size={18}
          className={`sm:h-[23px] sm:w-[23px] ${active ? "fill-current" : ""}`}
        />
      </span>
      <span className="max-w-full truncate text-[10px] font-black sm:text-[11px]">
        {label}
      </span>
    </button>
  );
}
