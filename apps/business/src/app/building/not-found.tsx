import Link from "next/link";
export default function BuildingNotFound() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8">
      <h1 className="text-2xl font-bold">Төсөл олдсонгүй</h1>
      <p className="mt-3 text-slate-600">
        Энэ төсөл нийтлэгдээгүй эсвэл хаяг өөрчлөгдсөн байна.
      </p>
      <Link
        href="/building"
        className="mt-5 inline-block font-semibold text-emerald-800 underline"
      >
        Бүх төсөл рүү буцах
      </Link>
    </section>
  );
}
