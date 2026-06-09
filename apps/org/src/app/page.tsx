const metrics = [
  { label: "Идэвхтэй салбар", value: "24" },
  { label: "Нийт ажилтан", value: "186" },
  { label: "Өнөөдрийн захиалга", value: "1,248" },
];

export default function OrgHome() {
  return (
    <section className="min-h-screen bg-gray-50 px-6 py-10 text-gray-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3 border-b border-gray-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
              MGL Store Org
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">
              Байгууллагын удирдлага
            </h1>
          </div>
          <span className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm">
            Next app scaffold ready
          </span>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          {metrics.map((metric) => (
            <article
              key={metric.label}
              className="rounded-md border border-gray-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-gray-500">{metric.label}</p>
              <p className="mt-3 text-3xl font-semibold">{metric.value}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
