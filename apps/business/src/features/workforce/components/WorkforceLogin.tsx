"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { PasswordInput } from "@/shared/ui/forms/PasswordInput";
import { useRouter } from "next/navigation";
import { Clock3, ArrowRight } from "lucide-react";
import "../workforce.css";
export function WorkforceLogin() {
  const router = useRouter(),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await fetch("/api/workforce-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const data = (await result.json()) as { message?: string };
      if (!result.ok) throw new Error(data.message ?? "Нэвтэрч чадсангүй");
      router.replace("/attendance");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Холболтын алдаа");
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="wf-login wf">
      <div className="wf-login-story">
        <Link href="/">MGL Business ↗</Link>
        <Clock3 size={48} />
        <p className="wf-kicker">ЦАГ УДИРДЛАГА</p>
        <h1>
          Багийн цагийг
          <br />
          нэг дор удирд.
        </h1>
        <p>
          Ирц, хуваарь, хүсэлт болон тайлан.
          <br />
          Байгууллагынхаа ажлын өдөр бүрийг тодорхой болго.
        </p>
      </div>
      <div className="wf-login-form">
        <form onSubmit={submit}>
          <p className="wf-kicker">MGL BUSINESS</p>
          <h2>Тавтай морил</h2>
          <p>Байгууллагын удирдах эрхтэй бүртгэлээр нэвтэрнэ үү.</p>
          {error && (
            <p className="wf-error" role="alert">
              {error}
            </p>
          )}
          <label>
            Имэйл эсвэл утас
            <input
              name="email"
              autoComplete="username"
              required
              maxLength={254}
            />
          </label>
          <div className="wf-field">
            <label htmlFor="workforce-password">Нууц үг</label>
            <PasswordInput
              id="workforce-password"
              name="password"
              autoComplete="current-password"
              required
              maxLength={1024}
            />
          </div>
          <button className="wf-primary" disabled={pending}>
            {pending ? "Нэвтэрч байна…" : "Нэвтрэх"}
            <ArrowRight size={17} />
          </button>
          <Link href="/account/password?context=workforce">Нууц үгээ мартсан уу?</Link>
          <Link href="/">Танилцуулга руу буцах</Link>
        </form>
      </div>
    </main>
  );
}
