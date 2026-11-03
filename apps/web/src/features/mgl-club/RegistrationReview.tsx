import { MapPin, Pencil, CheckCircle2 } from "lucide-react";
import { mglClubFields } from "@mgl/types";
import {
  registrationSteps,
  type RegistrationValues,
} from "./registration-steps";
import styles from "./registration.module.css";
export function RegistrationReview({
  values,
  onEdit,
}: {
  values: RegistrationValues;
  onEdit: (step: number) => void;
}) {
  return (
    <div className={styles.review}>
      <div className={styles.preview}>
        <span className={styles.previewIcon}>
          {Array.from(values.businessName)[0]}
        </span>
        <div>
          <span className={styles.previewLabel}>
            <CheckCircle2 size={12} />
            ТАНЫ БИЗНЕСИЙН ТАНИЛЦУУЛГА
          </span>
          <h3>{values.businessName}</h3>
          <p>
            <MapPin size={13} />
            {values.city}
            <span>·</span>
            {values.sector}
          </p>
        </div>
      </div>
      {registrationSteps.slice(0, -1).map((step, index) => (
        <section className={styles.reviewSection} key={step.shortTitle}>
          <header>
            <h3>{step.title}</h3>
            <button
              type="button"
              onClick={() => onEdit(index)}
              aria-label={`${step.shortTitle}: мэдээлэл засах`}
            >
              <Pencil size={13} />
              Засах
            </button>
          </header>
          <dl>
            {step.fields
              .filter((field) => values[field])
              .map((id) => (
                <div key={id}>
                  <dt>
                    {mglClubFields.find((field) => field.id === id)?.label}
                  </dt>
                  <dd>{values[id]}</dd>
                </div>
              ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
