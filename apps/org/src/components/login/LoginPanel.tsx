import LoginForm from "@/components/login/LoginForm";

export default function LoginPanel() {
  return (
    <section className="flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/70">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">
          org.mglstore.mn
        </p>
        <h2 className="mt-3 text-3xl font-black text-slate-950">
          Байгууллагаар нэвтрэх
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          Admin дээр үүсгэсэн login email эсвэл login утсаар нэвтэрнэ.
        </p>

        <LoginForm />
      </div>
    </section>
  );
}
