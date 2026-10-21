import type { ReactNode } from "react";
import { Plus } from "lucide-react";

interface RestaurantMenuCardProps {
  name: string;
  price: string;
  originalPrice?: string;
  available: number;
  visual: ReactNode;
  disabled: boolean;
  onSelect: () => void;
}

export function RestaurantMenuCard({
  name,
  price,
  originalPrice,
  available,
  visual,
  disabled,
  onSelect,
}: RestaurantMenuCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      title={name}
      className="group flex min-w-0 flex-col rounded-lg border border-[#273647] bg-[#122131] p-2.5 text-left transition-colors hover:border-[#75d1ff]/70 hover:bg-[#1c2b3c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 disabled:cursor-not-allowed disabled:opacity-45"
    >
      <span className="flex w-full items-start gap-2">
        {visual}
        <span className="line-clamp-3 min-w-0 flex-1 text-xs font-bold leading-4 text-slate-100">
          {name}
        </span>
      </span>
      <span className="mt-auto flex w-full items-end justify-between gap-1 pt-2">
        <span className="min-w-0">
          {originalPrice ? (
            <span className="block text-[10px] text-slate-400 line-through">
              {originalPrice}
            </span>
          ) : null}
          <span className="block text-sm font-black tabular-nums text-[#92d9ff]">
            {price}
          </span>
          <span className="mt-0.5 block text-[10px] font-semibold text-[#a0adb9]">
            {available > 0 ? `${available} порц боломжтой` : "Дууссан"}
          </span>
        </span>
        <Plus aria-hidden="true" className="h-4 w-4 shrink-0 text-[#92d9ff]" />
      </span>
    </button>
  );
}
