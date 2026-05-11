"use client";

interface OrganizationsSectionHeaderProps {
  resultCount: number;
}

export function OrganizationsSectionHeader({ resultCount }: OrganizationsSectionHeaderProps) {
  return (
    <div className="mb-5 flex items-baseline justify-between sm:mb-6">
      <div>
        <h2 className="text-base font-black text-gray-900 sm:text-lg">
          Хамтран ажиллагч байгууллагууд
        </h2>
        <p className="mt-0.5 text-xs text-gray-400">
          Идэвхтэй үйл ажиллагаа явуулж буй түнш байгууллагууд
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
        {resultCount.toLocaleString()} байгууллага
      </span>
    </div>
  );
}
