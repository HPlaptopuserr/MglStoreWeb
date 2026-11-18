"use client";
import { ArrowLeft, ArrowRight, Check, Info, LoaderCircle } from "lucide-react";
import { mglClubFields } from "@mgl/types";
import { useState } from "react";
import { ClubLogoField } from "./ClubLogoField";
import { RegistrationField } from "./RegistrationField";
import { RegistrationProgress } from "./RegistrationProgress";
import { RegistrationReview } from "./RegistrationReview";
import { RegistrationSuccess } from "./RegistrationSuccess";
import { registrationSteps } from "./registration-steps";
import { useClubRegistration } from "./useClubRegistration";
import styles from "./registration.module.css";

export function ClubRegistration() {
  const {
    step,
    pending,
    error,
    complete,
    paymentCredentials,
    review,
    formRef,
    headingRef,
    fieldsets,
    lastStep,
    active,
    goTo,
    submit,
    clearFieldError,
  } = useClubRegistration();
  const [logoBusy, setLogoBusy] = useState(false);
  if (complete) return <RegistrationSuccess credentials={paymentCredentials} />;
  return (
    <div className={styles.layout}>
      <RegistrationProgress step={step} pending={pending} onBackTo={goTo} />
      <form
        ref={formRef}
        onSubmit={(event) => {
          if (logoBusy) event.preventDefault();
          else void submit(event);
        }}
        onInput={clearFieldError}
        noValidate
        className={styles.form}
        aria-busy={pending}
      >
        <div className={styles.progressLine}>
          <span>
            Алхам {step + 1} / {registrationSteps.length}
          </span>
          <span>{active.shortTitle}</span>
        </div>
        <progress
          className={styles.progressBar}
          value={step + 1}
          max={registrationSteps.length}
          aria-label="Бүртгэлийн явц"
        />
        <header className={styles.formHeading}>
          <h2 ref={headingRef} tabIndex={-1}>
            {active.title}
          </h2>
          <p>{active.description}</p>
          {step === 0 && (
            <p>
              Энд оруулсан мэдээлэл гишүүдийн жагсаалтад пост болж харагдана.
              Танилцуулгын вэбийг Алтан гишүүнчлэлийн тусдаа хэсгээс бэлдэнэ.
            </p>
          )}
          {step < lastStep && (
            <span className={styles.requiredNote}>
              <b>*</b> Заавал бөглөх мэдээлэл
            </span>
          )}
        </header>
        {registrationSteps.map((item, index) => (
          <fieldset
            key={item.shortTitle}
            ref={(element) => {
              fieldsets.current[index] = element;
            }}
            hidden={step !== index}
            disabled={pending}
            className={styles.fields}
            aria-label={item.title}
          >
            {index === 0 && <ClubLogoField onBusy={setLogoBusy} />}
            {item.fields.map((id) => {
              const field = mglClubFields.find((field) => field.id === id);
              return field ? (
                <RegistrationField key={id} field={field} />
              ) : null;
            })}
            {index === lastStep && (
              <>
                <div className={styles.fullWidth}>
                  {review && (
                    <RegistrationReview values={review} onEdit={goTo} />
                  )}
                </div>
                <label className={styles.consent}>
                  <input name="consent" value="yes" type="checkbox" required />
                  <span>
                    <b>Мэдээллээ нийтлэхийг зөвшөөрч байна</b>
                    <span>
                      Миний нэр, бизнесийн танилцуулга, утас болон оруулсан
                      мэдээлэл MGL CLUB-ийн нийтэд нээлттэй жагсаалтад
                      харагдана.
                    </span>
                  </span>
                </label>
              </>
            )}
          </fieldset>
        ))}
        {error && (
          <p className={styles.error} role="alert">
            <Info size={17} />
            {error}
          </p>
        )}
        <footer className={styles.formFooter}>
          <div className={styles.actions} data-review={step === lastStep}>
            <button
              type="button"
              disabled={step === 0 || pending}
              onClick={() => goTo(step - 1)}
            >
              <ArrowLeft size={16} />
              Өмнөх
            </button>
            <button
              type="submit"
              className={styles.primary}
              disabled={pending || logoBusy}
            >
              {pending ? (
                <>
                  <LoaderCircle size={17} className={styles.spinner} />
                  Нийтэлж байна…
                </>
              ) : step === lastStep ? (
                <>
                  Бүртгэлээ нийтлэх
                  <Check size={17} />
                </>
              ) : (
                <>
                  Дараах
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </div>
          <p>
            {step < lastStep
              ? "Алхам хооронд шилжихэд бөглөсөн мэдээлэл арилахгүй."
              : "Зөвхөн зөвшөөрч, нийтлэх товч дарсны дараа мэдээлэл нийтлэгдэнэ."}
          </p>
        </footer>
      </form>
    </div>
  );
}
