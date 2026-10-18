"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowRight, Building2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { responseError } from "@/lib/building-management";
import { BuildingIllustration } from "../BuildingIllustration";
export function BuildingRegister() {
  const [mode, setMode] = useState<"new" | "existing">("existing");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (mode === "new" && data.password !== data.confirmPassword) {
      setError("Нууц үгийн давталт таарахгүй байна");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const input = { ...data };
      delete input.confirmPassword;
      const response = await fetch("/api/building-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, mode }),
      });
      if (!response.ok)
        throw new Error(await responseError(response, "Бүртгэж чадсангүй"));
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="building-login building-register">
      <section className="login-story">
        <p className="building-eyebrow">MGL BUSINESS / ШИНЭ ЭХЛЭЛ</p>
        <h1>
          Байгууллагаа холбо.
          <br />
          <em>Төслөө танилцуул.</em>
        </h1>
        <p>
          Бүртгүүлээд өөрийн байгууллагын төслүүдийг
          <br />
          ноорог болгон үүсгэх эрхтэй болно.
        </p>
        <BuildingIllustration />
        <div className="registration-rights">
          <ShieldCheck size={20} />
          <p>
            Зөвхөн өөрийн байгууллагын төслүүдийг удирдана. Нийтлэхийн өмнө
            төслийн мэдээллийг баталгаажуулна.
          </p>
        </div>
      </section>
      <section className="login-form-panel">
        <span className="empty-icon">
          {done ? <CheckCircle2 size={26} /> : <Building2 size={26} />}
        </span>
        {done ? (
          <div role="status">
            <h2>Бүртгэл амжилттай!</h2>
            <p className="registration-copy">
              Байгууллагын тань төслүүдийг бүртгэх эрх нээгдлээ. И-мэйл, нууц
              үгээрээ нэвтэрч эхний төслөө үүсгээрэй.
            </p>
            <Link href="/building/login" className="building-primary">
              Нэвтрэх <ArrowRight size={17} />
            </Link>
          </div>
        ) : (
          <>
            <p className="building-eyebrow">БАЙГУУЛЛАГЫН БҮРТГЭЛ</p>
            <h2>Бүртгүүлэх</h2>
            <p>MGL бүртгэлтэй бол одоогийн бүртгэлээ ашиглана.</p>
            <div className="registration-mode" aria-label="Бүртгэлийн төрөл">
              <button
                type="button"
                disabled={busy}
                aria-pressed={mode === "existing"}
                className={mode === "existing" ? "active" : ""}
                onClick={() => {
                  setMode("existing");
                  setError("");
                }}
              >
                MGL бүртгэлтэй
              </button>
              <button
                type="button"
                disabled={busy}
                aria-pressed={mode === "new"}
                className={mode === "new" ? "active" : ""}
                onClick={() => {
                  setMode("new");
                  setError("");
                }}
              >
                Шинэ хэрэглэгч
              </button>
            </div>
            <form onSubmit={submit}>
              <fieldset
                disabled={busy}
                className="registration-fields"
                key={mode}
              >
                {mode === "new" && (
                  <label>
                    Таны нэр
                    <input
                      name="fullName"
                      required
                      maxLength={120}
                      autoComplete="name"
                      placeholder="Овог, нэр"
                    />
                  </label>
                )}
                <label>
                  И-мэйл
                  <input
                    name="email"
                    type="email"
                    required
                    maxLength={254}
                    autoComplete="username"
                    placeholder="name@company.mn"
                  />
                </label>
                <div className="form-two-columns">
                  <label>
                    {mode === "existing" ? "Одоогийн нууц үг" : "Шинэ нууц үг"}
                    <input
                      name="password"
                      type="password"
                      required
                      minLength={mode === "new" ? 10 : 1}
                      maxLength={mode === "new" ? 72 : 1024}
                      autoComplete={
                        mode === "new" ? "new-password" : "current-password"
                      }
                      placeholder={
                        mode === "new"
                          ? "10-аас доошгүй тэмдэгт"
                          : "MGL нууц үг"
                      }
                    />
                  </label>
                  {mode === "new" && (
                    <label>
                      Нууц үг давтах
                      <input
                        name="confirmPassword"
                        type="password"
                        required
                        minLength={10}
                        maxLength={72}
                        autoComplete="new-password"
                      />
                    </label>
                  )}
                </div>
                <hr />
                <label>
                  Байгууллагын нэр
                  <input
                    name="organizationName"
                    required
                    maxLength={180}
                    autoComplete="organization"
                    placeholder="Компанийн албан ёсны нэр"
                  />
                </label>
                <div className="form-two-columns">
                  <label>
                    Байгууллагын регистр
                    <input
                      name="taxId"
                      required
                      minLength={6}
                      maxLength={20}
                      placeholder="Регистрийн дугаар"
                    />
                  </label>
                  <label>
                    Холбоо барих утас
                    <input
                      name="phone"
                      type="tel"
                      required
                      maxLength={20}
                      autoComplete="tel"
                      placeholder="Утасны дугаар"
                    />
                  </label>
                </div>
                <p className="registration-copy">
                  Энэ бүртгэлээр шинэ байгууллага үүснэ. Өмнө бүртгэгдсэн
                  байгууллагад нэгдэх бол тухайн байгууллагын эзэмшигчээр эрхээ
                  нэмүүлнэ.
                </p>
                {error && (
                  <p role="alert" className="building-error-message">
                    {error}
                  </p>
                )}
                <button className="building-primary" disabled={busy}>
                  {busy ? "Бүртгэж байна…" : "Байгууллага бүртгүүлэх"}
                  <ArrowRight size={18} />
                </button>
              </fieldset>
            </form>
          </>
        )}
        <div className="building-auth-switch">
          <span>Байгууллагын эрхтэй юу?</span>
          <Link href="/building/login">
            Нэвтрэх <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}
