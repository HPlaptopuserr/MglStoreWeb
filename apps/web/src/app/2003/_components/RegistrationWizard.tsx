"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import { useLenis } from "@studio-freight/react-lenis";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import styles from "./registration-wizard.module.css";

type WizardStep = { title: string; content: ReactNode };

export function RegistrationWizard({
  steps,
  onSubmit,
  pending = false,
  submitLabel = "Бүртгэл илгээх",
  notice,
  editing = false,
  onExit,
}: {
  steps: WizardStep[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending?: boolean;
  submitLabel?: string;
  notice?: ReactNode;
  editing?: boolean;
  onExit?: () => void;
}) {
  const [step, setStep] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const lenis = useLenis();
  useLockBodyScroll();
  useEffect(() => {
    if (!lenis) return;
    const wasStopped = lenis.isStopped;
    lenis.stop();
    return () => {
      if (!wasStopped) lenis.start();
    };
  }, [lenis]);

  function moveTo(index: number) {
    setStep(index);
    bodyRef.current?.scrollTo({ top: 0 });
    requestAnimationFrame(() => headingRef.current?.focus());
  }
  function validate(index: number): boolean {
    const section = formRef.current?.querySelector(`[data-step="${index}"]`);
    const inputs = section?.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("input, select, textarea");
    for (const input of inputs ?? []) {
      if (!input.checkValidity()) {
        input.reportValidity();
        return false;
      }
    }
    return true;
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !validate(step)) return;
    if (step < steps.length - 1) {
      moveTo(step + 1);
      return;
    }
    onSubmit(event);
  }
  return (
    <dialog
      ref={dialogRef}
      className={styles.screen}
      data-lenis-prevent="true"
      aria-labelledby="registration-step-title"
      onCancel={(event) => {
        event.preventDefault();
        if (onExit) onExit();
        else router.push("/2003/mine");
      }}
    >
      <header className={styles.header}>
        {onExit ? (
          <button
            type="button"
            onClick={onExit}
            aria-label="Жагсаалт руу буцах"
          >
            <ArrowLeft size={22} /> Буцах
          </button>
        ) : (
          <Link href="/2003/mine" aria-label="Жагсаалт руу буцах">
            <ArrowLeft size={22} /> Буцах
          </Link>
        )}
        <span>2003 · {editing ? "Мэдээллээ засах" : "Нэгдэх"}</span>
      </header>
      <form
        ref={formRef}
        onSubmit={submit}
        noValidate
        className={styles.form}
        id="registration"
      >
        <div ref={bodyRef} className={styles.body}>
          <div className={styles.content}>
            <p className={styles.counter} aria-live="polite">
              Алхам {step + 1} / {steps.length}
            </p>
            <ol className={styles.progress} aria-label="Бүртгэлийн алхмууд">
              {steps.map((item, index) => (
                <li
                  key={item.title}
                  aria-current={index === step ? "step" : undefined}
                  data-complete={index <= step}
                >
                  <span className={styles.srOnly}>{item.title}</span>
                </li>
              ))}
            </ol>
            <h1
              id="registration-step-title"
              tabIndex={-1}
              ref={headingRef}
              className={styles.title}
            >
              {steps[step].title}
            </h1>
            {notice && <div className={styles.notice}>{notice}</div>}
            <fieldset disabled={pending} className={styles.fields}>
              {steps.map((item, index) => (
                <section
                  key={item.title}
                  data-step={index}
                  hidden={index !== step}
                  className={styles.step}
                >
                  {item.content}
                </section>
              ))}
            </fieldset>
          </div>
        </div>
        <footer className={styles.footer}>
          <div>
            {step > 0 && (
              <button
                type="button"
                disabled={pending}
                onClick={() => moveTo(step - 1)}
                className={styles.back}
              >
                <ArrowLeft size={18} /> Өмнөх
              </button>
            )}
            <button type="submit" disabled={pending} className={styles.next}>
              {pending ? (
                <>
                  <LoaderCircle
                    size={18}
                    className="motion-safe:animate-spin"
                  />{" "}
                  Хадгалж байна…
                </>
              ) : (
                <>
                  {step === steps.length - 1 ? submitLabel : "Үргэлжлүүлэх"}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
