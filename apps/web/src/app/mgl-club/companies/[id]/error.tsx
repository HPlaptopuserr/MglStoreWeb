"use client";
import Link from "next/link";
export default function CompanyError({ reset }: { reset: () => void }) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20 text-center">
      <h1 className="text-2xl font-bold">
        Байгууллагын мэдээлэл ачаалж чадсангүй
      </h1>
      <p className="my-5">Холболтоо шалгаад дахин оролдоно уу.</p>
      <button
        onClick={reset}
        className="rounded-xl bg-emerald-950 px-5 py-3 text-white"
      >
        Дахин оролдох
      </button>
      <Link className="ml-5 underline" href="/mgl-club">
        Байгууллагууд руу буцах
      </Link>
    </section>
  );
}
