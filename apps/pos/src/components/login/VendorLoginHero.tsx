export default function VendorLoginHero() {
  return (
    <section className="relative hidden overflow-hidden bg-slate-900 p-16 text-white lg:flex lg:w-1/2 lg:flex-col lg:justify-between">
      <div className="pointer-events-none absolute inset-0 opacity-10">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full w-full fill-current text-amber-500"
        >
          <polygon points="0,100 100,0 100,100" />
        </svg>
      </div>

      <div className="relative z-10">
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight">
          MGL<span className="text-amber-500">STORE</span>
        </h1>
        <p className="max-w-md text-lg text-slate-400">
          Үндэсний үйлдвэрлэгч, нийлүүлэгчдийн нэгдсэн экосистем. Монголдоо
          мөнгөө үлдээх хөдөлгөөнд нэгдээрэй.
        </p>
      </div>

      <div className="relative z-10 rounded-xl border border-slate-700 bg-slate-800/50 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-amber-500/20 p-3 text-amber-500">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm text-slate-400">Сүлжээний өсөлт</p>
            <p className="text-xl font-bold">240+ Харилцагч байгууллага</p>
          </div>
        </div>
      </div>
    </section>
  );
}
