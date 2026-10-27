"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, Eye, EyeOff } from "lucide-react";
import { responseError } from "@/features/building/api/management-client";
import { BuildingIllustration } from "../components/BuildingIllustration";
export function BuildingLogin({ buyer = false }: { buyer?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/building-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          ...(buyer ? { audience: "buyer" } : {}),
        }),
      });
      if (!response.ok)
        throw new Error(await responseError(response, "Нэвтэрч чадсангүй"));
      router.replace(buyer ? "/building/my-purchases" : "/building/manage");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Алдаа гарлаа");
      setBusy(false);
    }
  }
  return (
    <main className="building-login">
      <section className="login-story">
        <p className="building-eyebrow">MGL BUSINESS WORKSPACE</p>
        <h1>
          Төслөө бүтээ.
          <br />
          <em>Үнэ цэнээ хүргэ.</em>
        </h1>
        <p>
          Барилгын бүртгэл, мэдээллээ
          <br />
          нэг цэгээс удирдах таны ажлын орчин.
        </p>
        <BuildingIllustration />
      </section>
      <section className="login-form-panel">
        <span className="empty-icon">
          <LockKeyhole size={25} />
        </span>
        <p className="building-eyebrow">ТАВТАЙ МОРИЛ</p>
        <h2>{buyer ? "Худалдан авагчаар нэвтрэх" : "Удирдлагад нэвтрэх"}</h2>
        <p>
          {buyer
            ? "Гэрээнд сонгосон и-мэйл бүхий MGL бүртгэлээрээ нэвтэрнэ үү."
            : "Барилгын байгууллагынхаа MGL бүртгэлээрээ нэвтэрнэ үү."}
        </p>
        <form onSubmit={submit}>
          <label>
            И-мэйл
            <input
              autoComplete="username"
              name="email"
              type="email"
              required
              placeholder="name@company.mn"
              maxLength={254}
            />
          </label>
          <label>
            Нууц үг
            <div className="password-input">
              <input
                autoComplete="current-password"
                name="password"
                type={visible ? "text" : "password"}
                required
                maxLength={1024}
                placeholder="Нууц үгээ оруулна уу"
              />
              <button
                type="button"
                aria-label={visible ? "Нууц үг нуух" : "Нууц үг харуулах"}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </label>
          {error && (
            <p role="alert" className="building-error-message">
              {error}
            </p>
          )}
          <button disabled={busy} className="building-primary">
            {busy ? "Шалгаж байна…" : "Нэвтрэх"}
            <ArrowRight size={18} />
          </button>
        </form>
        <Link href={`/account/password?context=${buyer ? "buyer" : "building"}`}>Нууц үгээ мартсан уу?</Link>
        {!buyer && (
          <div className="building-auth-switch">
            <span>Барилгын байгууллага бүртгүүлэх үү?</span>
            <Link href="/building/register">
              Бүртгүүлэх <ArrowRight size={16} />
            </Link>
          </div>
        )}
        <p className="login-help">
          <LockKeyhole size={14} /> Таны бүртгэл MGL системтэй холбогдоно.
        </p>
      </section>
    </main>
  );
}
