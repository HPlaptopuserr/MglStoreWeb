import Link from "next/link";
import { ArrowLeft, Check, Network } from "lucide-react";
import { registrationSteps } from "./registration-steps";
import styles from "./registration.module.css";

export function RegistrationProgress({
  step,
  pending,
  onBackTo,
}: {
  step: number;
  pending: boolean;
  onBackTo: (step: number) => void;
}) {
  return (
    <aside className={styles.sidebar}>
      <Link href="/mgl-club" className={styles.backLink}>
        <ArrowLeft size={15} />
        Гишүүдийн жагсаалт
      </Link>
      <div className={styles.intro}>
        <span className={styles.eyebrow}>MGL CLUB-Д НЭГДЭХ</span>
        <h1>
          Бизнесээ таниул.
          <br />
          <em>Хамтрагчаа ол.</em>
        </h1>
        <p>Дөрвөн энгийн алхмаар бизнесийн танилцуулгаа үүсгээрэй.</p>
      </div>
      <nav aria-label="Бүртгэлийн алхмууд">
        <ol className={styles.steps}>
          {registrationSteps.map((item, index) => (
            <li
              key={item.shortTitle}
              data-active={index === step}
              data-complete={index < step}
            >
              <button
                type="button"
                disabled={index > step || pending}
                aria-current={index === step ? "step" : undefined}
                onClick={() => onBackTo(index)}
              >
                <span className={styles.stepNumber}>
                  {index < step ? <Check size={16} /> : index + 1}
                </span>
                <span>
                  <b>{item.shortTitle}</b>
                  <small>
                    {index < step
                      ? "Бөглөсөн · Засах"
                      : index === step
                        ? "Одоо бөглөж байна"
                        : "Дараагийн алхам"}
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <div className={styles.networkNote}>
        <Network size={22} />
        <div>
          <h2>Нэг клуб. Олон боломж.</h2>
          <p>
            21 аймгийн бизнес эрхлэгчдэд бүтээгдэхүүн, үйлчилгээгээ танилцуулж,
            шууд холбогдоорой.
          </p>
        </div>
      </div>
    </aside>
  );
}
