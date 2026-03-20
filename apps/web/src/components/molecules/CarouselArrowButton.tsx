"use client";

interface Props {
  direction: "left" | "right";
  onClick: () => void;
}

export const CarouselArrowButton = ({ direction, onClick }: Props) => {
  const isLeft = direction === "left";

  return (
    <button
      onClick={onClick}
      className={`absolute ${isLeft ? "left-0" : "right-0"} top-1/3 -translate-y-1/2 z-20 w-12 h-12 bg-white border border-gray-300 flex items-center justify-center hover:bg-black hover:text-white hover:border-black transition-colors shadow-md`}
      aria-label={isLeft ? "Scroll left" : "Scroll right"}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        {isLeft ? (
          <path d="M19 12H5M12 19l-7-7 7-7" />
        ) : (
          <path d="M5 12h14M12 5l7 7-7 7" />
        )}
      </svg>
    </button>
  );
};