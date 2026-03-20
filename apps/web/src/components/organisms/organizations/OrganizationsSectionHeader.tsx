"use client";

interface OrganizationsSectionHeaderProps {
  resultCount: number;
}

export function OrganizationsSectionHeader({
  resultCount,
}: OrganizationsSectionHeaderProps) {
  return (
    <>
      <div className="mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-2xl font-black text-gray-900">
          Хамтран ажиллагч байгууллагууд
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Идэвхтэй үйл ажиллагаа явуулж буй түнш байгууллагууд
        </p>
      </div>

      <div className="flex items-center justify-between mb-4 sm:mb-8">
        <p className="text-sm text-gray-500">
          <span className="font-bold text-black">{resultCount}</span> байгууллага
          олдлоо
        </p>
      </div>
    </>
  );
}