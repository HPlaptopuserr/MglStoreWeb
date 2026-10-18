export default function BuildingLoading() {
  return (
    <div
      role="status"
      aria-label="Барилгын төслүүд ачаалж байна"
      className="space-y-6"
    >
      <div className="h-12 w-2/3 animate-pulse rounded-xl bg-slate-200 motion-reduce:animate-none" />
      <div className="grid gap-6 sm:grid-cols-3">
        {[1, 2, 3].map((id) => (
          <div
            key={id}
            className="h-72 animate-pulse rounded-2xl bg-slate-200 motion-reduce:animate-none"
          />
        ))}
      </div>
      <span className="sr-only">Ачаалж байна…</span>
    </div>
  );
}
