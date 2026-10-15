import {
  ArrowUpRight,
  Clock3,
  Fingerprint,
  Network,
  Sparkles,
} from "lucide-react";
import styles from "../registration.module.css";

export function RegistrationIntro() {
  return (
    <section className={styles.intro}>
      <div className={styles.eyebrow}>
        <span /> ХОЛБООТОЙ БАЙХЫН ЭХЛЭЛ
      </div>
      <div className={styles.year} aria-label="2003">
        2003<span>✳</span>
      </div>
      <h1>
        Бидний холбоо.
        <br />
        <span>Шинэ боломж.</span>
      </h1>
      <p className={styles.description}>
        Өөр өөр замаар, өөр өөр салбарт.
        <br />
        Харин энд бид дахин танилцаж, мэдлэг, туршлага, боломжоо хуваалцана.
      </p>
      <div className={styles.introMeta}>
        <Clock3 size={16} /> 1–2 минут <span /> Бяцхан танилцуулга, том эхлэл
      </div>
      <div className={styles.connectionCard}>
        <div className={styles.cardTop}>
          <span>ХАМТДАА ИЛҮҮ ИХИЙГ</span>
          <ArrowUpRight size={22} />
        </div>
        <div className={styles.orbit} aria-hidden="true">
          <div className={styles.orbitRing} />
          <div className={styles.orbitCore}>03</div>
          <span className={styles.orbitOne}>
            <Fingerprint size={24} />
          </span>
          <span className={styles.orbitTwo}>
            <Network size={24} />
          </span>
          <span className={styles.orbitThree}>
            <Sparkles size={23} />
          </span>
          <i />
          <b />
        </div>
        <p>
          Нэг танилцаанаас
          <br />
          олон боломж эхэлнэ.
        </p>
        <div className={styles.tags}>
          <span>Мэргэжил</span>
          <span>Бизнес</span>
          <span>Хамтын ажиллагаа</span>
        </div>
      </div>
    </section>
  );
}
