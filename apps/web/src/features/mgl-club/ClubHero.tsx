import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDown,
  Handshake,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import type { ClubSummary } from "./club-summary";
import styles from "./club-design.module.css";
export function ClubHero({ summary }: { summary: ClubSummary }) {
  return (
    <section className={styles.hero} id="hero">
      <div className={styles.heroInner}>
        <div>
          <p className={styles.heroEyebrow}>
            <i />
            БИЗНЕСЭЭРЭЭ ХОЛБОГДЪЁ
          </p>
          <h1>
            Таны дараагийн хамтрагч <em>энд бий.</em>
          </h1>
          <p className={styles.lead}>
            Бизнесээ танилцуулж, найдвартай үйлчилгээгээ санал болгоорой.
            Хэрэгтэй бараа, бүтээгдэхүүн, туслан гүйцэтгэгчээ клубийн гишүүдээс
            шууд олж, харилцан итгэлцлээр хамтран ажиллацгаая.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primary} href="/mgl-club/join">
              Бизнесээ бүртгүүлэх <ArrowUpRight size={17} />
            </Link>
            <a className={styles.secondary} href="#introduction">
              Клубийн танилцуулга <ArrowDown size={17} />
            </a>
          </div>
          <p className={styles.heroNote}>
            ✓ Бүх салбарын бизнес эрхлэгчид болон 21 аймгийн төлөөлөлд нээлттэй.
          </p>
          <div className={styles.metrics}>
            <div>
              <strong>{summary.total ?? "—"}</strong>
              <span>Бүртгэлтэй гишүүн</span>
            </div>
            <div>
              <strong>
                21 <small>Аймаг</small>
              </strong>
              <span>Орон даяар сүлжээ</span>
            </div>
            <div>
              <strong>
                {summary.sectors ?? "—"} <small>Салбар</small>
              </strong>
              <span>Бүтээгдэхүүн, үйлчилгээ</span>
            </div>
            <div>
              <strong>B2B</strong>
              <span>Шууд хамтын ажиллагаа</span>
            </div>
          </div>
        </div>
        <aside className={styles.heroPanel} id="benefits">
          <div className={styles.panelHeading}>
            НЭГ КЛУБ. ОЛОН БОЛОМЖ.<span>B2B Core</span>
          </div>
          {[
            {
              icon: Sparkles,
              title: "Бизнесээ таниул",
              text: "Юу хийдэг, юугаар тусалж чадахаа клуб дотор нарийвчлан хуваалцаж зах зээлээ тэлнэ.",
            },
            {
              icon: Handshake,
              title: "Хамтрагчаа ол",
              text: "Чиглэл, үйлчилгээ, шаардлагатай хангамжаараа орон нутгийн бизнесүүдтэй шууд холбогдоно.",
            },
            {
              icon: ShoppingBag,
              title: "Нэгнээсээ худалдан ав",
              text: "Клубийн гишүүдээсээ шууд үнийн санал авч, хамгийн тохиромжтой нөхцөлөөр тохиролц.",
            },
          ].map(({ icon: Icon, title, text }, index) => (
            <div className={styles.benefit} key={title}>
              <span>
                <Icon size={23} />
              </span>
              <div>
                <small>0{index + 1}</small>
                <h2>{title}</h2>
                <p>{text}</p>
              </div>
            </div>
          ))}
          <a className={styles.panelFoot} href="#about">
            Харилцан дэмжлэгээс хамтын өсөлт рүү <ArrowUpRight size={15} />
          </a>
        </aside>
      </div>
    </section>
  );
}
