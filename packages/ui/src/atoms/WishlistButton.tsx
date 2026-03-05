import { Heart } from "lucide-react";
import React from "react";

interface WishlistButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function WishlistButton({
  active = false,
  className = "",
  ...props
}: WishlistButtonProps) {
  return (
    <button
      type="button"
      aria-label="Add to wishlist"
      className={`absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full 
      bg-white/90 text-slate-900 shadow-sm backdrop-blur hover:bg-white
      ${className}`}
      {...props}
    >
      <Heart
        className={`h-5 w-5 ${active ? "fill-red-500 text-red-500" : ""}`}
        strokeWidth={1.5}
      />
    </button>
  );
}
