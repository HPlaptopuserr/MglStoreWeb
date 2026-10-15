import { BriefcaseBusiness, Rocket, UserRound } from "lucide-react";
import styles from "../registration.module.css";

const choices = [
  {
    value: "yes",
    label: "Тийм, эрхэлдэг",
    description: "Бизнесээ танилцуулъя",
    icon: BriefcaseBusiness,
  },
  {
    value: "no",
    label: "Одоогоор үгүй",
    description: "Мэргэжлээрээ ажилладаг",
    icon: UserRound,
  },
  {
    value: "planning",
    label: "Төлөвлөж байна",
    description: "Шинэ эхлэлийн өмнө",
    icon: Rocket,
  },
];

export function BusinessChoice({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-labelledby="business-label"
      className={styles.choices}
    >
      {choices.map(({ value: option, label, description, icon: Icon }) => (
        <label
          key={option}
          className={`${styles.choice} ${value === option ? styles.selected : ""}`}
        >
          <input
            type="radio"
            name="business"
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
            required
          />
          <Icon size={22} strokeWidth={1.6} aria-hidden="true" />
          <strong>{label}</strong>
          <span>{description}</span>
        </label>
      ))}
    </div>
  );
}
