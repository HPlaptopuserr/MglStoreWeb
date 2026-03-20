"use client";

export function OrganizationsLoadingGrid() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-28 sm:h-44 bg-gray-100 rounded-xl" />
        </div>
      ))}
    </div>
  );
}