import { Clock3, MapPin, Truck } from "lucide-react";
import type { MglClubMember } from "@mgl/types";
import styles from "./member-dialog.module.css";

export function MemberBusinessFacts({ member }: { member: MglClubMember }) {
  const facts = [
    {
      label: "Хаяг, байршил",
      value: member.address || member.city,
      icon: MapPin,
    },
    { label: "Ажиллах цаг", value: member.workingHours, icon: Clock3 },
    { label: "Үйлчилгээ үзүүлэх бүс", value: member.serviceArea, icon: Truck },
  ].filter((fact) => fact.value);
  return (
    <section className={styles.infoSection}>
      <h3>Байршил, цагийн хуваарь</h3>
      <dl className={styles.locationFacts}>
        {facts.map(({ label, value, icon: Icon }) => (
          <div key={label}>
            <span className={styles.factIcon}>
              <Icon size={18} />
            </span>
            <div>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
