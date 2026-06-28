import VendorLoginForm from "@/components/login/VendorLoginForm";

const WEB_URL = process.env.NEXT_PUBLIC_URL || "https://mglstore.mn";

export default function VendorLoginPanel() {
  return (
    <section className="flex w-full items-center justify-center p-8 sm:p-12 lg:w-1/2">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-100 bg-white p-10 shadow-xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Системд нэвтрэх
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Admin-аас үүсгэсэн owner эсвэл ажилтны login эрхээр нэвтэрнэ.
          </p>
        </div>

        <VendorLoginForm />

        <p className="mt-6 text-center text-sm text-slate-500">
          Байгууллагаар бүртгүүлэх хүсэлтэй бол{" "}
          <a
            href={`${WEB_URL}/company/partnership#partnership-form`}
            className="font-bold text-slate-900 transition-colors hover:text-amber-600"
          >
            энд дарна уу
          </a>
        </p>
      </div>
    </section>
  );
}
