"use client";

interface OrganizationsSectionHeaderProps {
  resultCount: number;
  isLocalMode?: boolean;
}

export function OrganizationsSectionHeader({ resultCount, isLocalMode = false }: OrganizationsSectionHeaderProps) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-5 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
          {isLocalMode ? "Орон нутгийн түнш байгууллагууд" : "Хамтран ажиллагч байгууллагууд"}
        </h2>
        <p className="mt-1 text-xs font-medium leading-5 text-slate-500 sm:text-sm">
          {isLocalMode ? "Аймаг, орон нутагт үйл ажиллагаа явуулж буй баталгаажсан бизнесүүд" : "Идэвхтэй үйл ажиллагаа явуулж буй түнш байгууллагууд"}
        </p>
      </div>
      <span className="w-fit shrink-0 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 ring-1 ring-blue-100">
        {resultCount.toLocaleString()} байгууллага
      </span>
    </div>
  );
}
