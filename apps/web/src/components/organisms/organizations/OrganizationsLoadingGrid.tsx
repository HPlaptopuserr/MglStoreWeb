"use client";

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-gray-900/8 shadow-sm">
      {/* Banner skeleton */}
      <div className="relative h-32 w-full overflow-hidden bg-gray-100 sm:h-40">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      </div>

      <div className="px-3.5 pb-3.5 pt-7 sm:px-4 sm:pb-4 sm:pt-8">
        {/* Logo placeholder (overlaps banner) */}
        <div className="absolute -mt-[52px] ml-[-2px] h-12 w-12 rounded-full bg-gray-200 ring-2 ring-white sm:h-14 sm:w-14" />

        {/* Name skeleton */}
        <div className="mt-1 h-4 w-3/5 rounded-full bg-gray-100" />

        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
          <div className="h-3 w-16 rounded-full bg-gray-100" />
          <div className="h-7 w-7 rounded-full bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

export function OrganizationsLoadingGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
