interface WorkDetails {
  workplace: string;
  department: string;
  jobTitle: string;
}
const fields = [
  { name: "workplace", label: "Ажлын газар / байгууллага", maxLength: 200, autoComplete: "organization" },
  { name: "department", label: "Хэлтэс", maxLength: 120, autoComplete: "off" },
  { name: "jobTitle", label: "Албан тушаал", maxLength: 120, autoComplete: "organization-title" },
] as const;

export function CreditCustomerWorkFields({
  value, onChange,
}: { value: WorkDetails; onChange: (value: WorkDetails) => void }) {
  return (
    <fieldset className="rounded-2xl border border-zinc-800 p-3">
      <legend className="px-1 text-xs font-semibold text-zinc-400">Ажлын мэдээлэл (заавал биш)</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <label key={field.name} className={`block ${field.name === "workplace" ? "sm:col-span-2" : ""}`}>
            <span className="text-xs font-semibold text-zinc-400">{field.label}</span>
            <input
              name={field.name}
              value={value[field.name]}
              onChange={(event) => onChange({ ...value, [field.name]: event.target.value })}
              maxLength={field.maxLength}
              autoComplete={field.autoComplete}
              className="mt-2 h-12 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-bold text-white outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
