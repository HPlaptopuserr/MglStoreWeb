"use client";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { loginPath, type AccountContext } from "../model/password";
import { NewPasswordFields } from "./NewPasswordFields";
import { SmsInstructions } from "./SmsInstructions";
import { usePasswordFlow } from "./usePasswordFlow";
import "./password.css";
export function PasswordWorkspace({
  context,
  change,
}: {
  context: AccountContext;
  change: boolean;
}) {
  const flow = usePasswordFlow(context, change);
  const back = change
    ? context === "workforce"
      ? "/attendance"
      : context === "buyer"
        ? "/building/my-purchases"
        : "/building/manage"
    : loginPath(context);
  const title =
    flow.step === "done"
      ? "Нууц үг шинэчлэгдлээ"
      : flow.step === "sms"
        ? "Утасны дугаараа баталгаажуулах"
        : change
          ? "Нууц үг солих"
          : flow.step === "password"
            ? "Шинэ нууц үг үүсгэх"
            : "Нууц үгээ сэргээх";
  return (
    <main className="account-page">
      <div className="account-brand">
        <Link href="/">
          MGL <strong>Business</strong>
        </Link>
        <span>БҮРТГЭЛИЙН АЮУЛГҮЙ БАЙДАЛ</span>
      </div>
      <section className="account-card" aria-labelledby="account-title">
        <div className="account-icon">
          {flow.step === "done" ? (
            <CheckCircle2 size={28} />
          ) : (
            <ShieldCheck size={28} />
          )}
        </div>
        <p className="account-eyebrow">
          {change ? "БҮРТГЭЛИЙН ТОХИРГОО" : "VERIFY.MN · SMS БАТАЛГААЖУУЛАЛТ"}
        </p>
        <h1 id="account-title" aria-live="polite" aria-atomic="true">
          {title}
        </h1>
        {flow.step === "done" ? (
          <div role="status">
            <p>Таны MGL бүртгэлийн нууц үг амжилттай шинэчлэгдлээ.</p>
            <Link className="account-primary" href={back}>
              {change ? "Ажлын орчин руу буцах" : "Шинэ нууц үгээр нэвтрэх"}
              <ArrowRight size={17} />
            </Link>
          </div>
        ) : (
          <>
            <p className="account-description">
              {change
                ? "Одоогийн нууц үгээ баталгаажуулж шинэ нууц үг тохируулна уу."
                : flow.step === "phone"
                  ? "MGL бүртгэлтэй утасны дугаараа оруулж, SMS-ээр баталгаажуулна уу."
                  : flow.step === "password"
                    ? "Утас баталгаажлаа. Бүртгэлдээ шинэ нууц үг тохируулна уу."
                    : "SMS-ээ илгээсний дараа баталгаажуулах товчийг дарна уу."}
            </p>
            {!change && (
              <ol className="account-steps" aria-label="Сэргээх алхмууд">
                {["Дугаар", "SMS", "Нууц үг"].map((label, index) => (
                  <li
                    key={label}
                    aria-current={
                      index === ["phone", "sms", "password"].indexOf(flow.step)
                        ? "step"
                        : undefined
                    }
                  >
                    {index + 1}. {label}
                  </li>
                ))}
              </ol>
            )}
            <form onSubmit={flow.submit} aria-busy={flow.busy}>
              <fieldset disabled={flow.busy} key={flow.step}>
                {flow.step === "phone" && (
                  <label htmlFor="recovery-phone">
                    Бүртгэлтэй утасны дугаар
                    <input
                      id="recovery-phone"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="9911 2233"
                      maxLength={32}
                      required
                    />
                  </label>
                )}
                {flow.step === "sms" && flow.challenge && (
                  <SmsInstructions
                    challenge={flow.challenge}
                    remaining={flow.remaining}
                  />
                )}
                {flow.step === "password" && (
                  <NewPasswordFields change={change} />
                )}
                {flow.error && (
                  <p className="account-error" role="alert">
                    {flow.error}
                  </p>
                )}
                <button
                  className="account-primary"
                  disabled={
                    flow.busy || (flow.step === "sms" && flow.remaining === 0)
                  }
                >
                  {flow.busy
                    ? "Шалгаж байна…"
                    : flow.step === "phone"
                      ? "Баталгаажуулалт эхлүүлэх"
                      : flow.step === "sms"
                        ? "SMS илгээсэн · Баталгаажуулах"
                        : "Нууц үг шинэчлэх"}
                  <ArrowRight size={17} />
                </button>
                {(flow.step === "sms" ||
                  (!change && flow.step === "password")) && (
                  <button
                    type="button"
                    className="account-secondary"
                    onClick={flow.restart}
                  >
                    Дугаараа засах / Дахин эхлүүлэх
                  </button>
                )}
              </fieldset>
            </form>
            {change && (
              <Link
                className="account-secondary"
                href={`/account/password?context=${context}`}
              >
                Одоогийн нууц үгээ мартсан уу?
              </Link>
            )}
          </>
        )}
        <Link className="account-back" href={back}>
          <ArrowLeft size={16} />
          {change ? "Ажлын орчин" : "Нэвтрэх хэсэг рүү буцах"}
        </Link>
      </section>
      <p className="account-footer">Нэг MGL бүртгэл · Нэгдсэн ажлын орчин</p>
    </main>
  );
}
