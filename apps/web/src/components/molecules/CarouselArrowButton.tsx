"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  direction: "left" | "right";
  onClick: () => void;
}

export const CarouselArrowButton = ({ direction, onClick }: Props) => {
  const isLeft = direction === "left";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute ${
        isLeft ? "-left-3 md:-left-5" : "-right-3 md:-right-5"
      } top-[44%] z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/95 text-slate-900 shadow-[0_14px_34px_rgba(15,23,42,0.22)] backdrop-blur transition-all duration-200 hover:scale-105 hover:border-amber-300 hover:bg-amber-400 hover:text-black active:scale-95 md:h-12 md:w-12`}
      aria-label={isLeft ? "Зүүн тийш гүйлгэх" : "Баруун тийш гүйлгэх"}
    >
      {isLeft ? (
        <ChevronLeft className="h-5 w-5" strokeWidth={2.8} />
      ) : (
        <ChevronRight className="h-5 w-5" strokeWidth={2.8} />
      )}
    </button>
  );
};
