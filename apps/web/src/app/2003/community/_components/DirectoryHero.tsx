import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  UsersRound,
  BriefcaseBusiness,
  Rocket,
} from "lucide-react";
import styles from "../community.module.css";
interface DirectoryHeroProps {
  members: number;
  cities: number;
  sectors: number;
  demo: boolean;
}
export function DirectoryHero({
  members,
  cities,
  sectors,
  demo,
}: DirectoryHeroProps) {
  return (
    <>
      <section className={`${styles.hero} ${styles.directoryHero}`}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            <span /> МОНГОЛЫН 2003 ОНЫ ТӨГСӨГЧДИЙН ХҮРЭЭЛЭЛ
          </p>
          <h1>
            Найзуудаа олъё.
            <br />
            <span>Хамтдаа хөгжицгөөе.</span>
          </h1>
          <p>
            Хэн хаана, юу хийж байгааг мэдэж,
            <br className={styles.desktopBreak} /> мэдлэг, туршлага, бизнесийн
            боломжоо хуваалцъя.
          </p>
          <div className={styles.heroActions}>
            <a href="#directory" className={styles.primary}>
              Хүмүүстэй танилцах <ArrowDown size={17} />
            </a>
            <Link href="/2003/join" className={styles.heroLink}>
              Би ч бас нэгдье <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
        <div className={styles.heroArtwork} aria-hidden="true">
          <div className={styles.orbit} />
          <span className={styles.artLabel}>НЭГ ҮЕ. НЭГ ХОЛБОО.</span>
          <strong>
            2003<span>✳</span>
          </strong>
          <div className={styles.artIcons}>
            <span>
              <UsersRound size={22} />
            </span>
            <span>
              <BriefcaseBusiness size={22} />
            </span>
            <span>
              <Rocket size={22} />
            </span>
          </div>
          <p>Танилцъя. Хамтаръя. Бүтээе.</p>
        </div>
      </section>
      <aside
        className={styles.stats}
        aria-label={demo ? "Туршилтын мэдээллийн тоо" : "Хүрээллийн мэдээлэл"}
      >
        <div>
          <strong>{members}</strong>
          <span>{demo ? "жишээ танилцуулга" : "танилцуулга"}</span>
        </div>
        <div>
          <strong>{cities}</strong>
          <span>хот, байршил</span>
        </div>
        <div>
          <strong>{sectors}</strong>
          <span>үйл ажиллагааны чиглэл</span>
        </div>
        <p>
          Нэг танилцаанаас
          <br />
          <b>олон боломж эхэлнэ ↗</b>
        </p>
      </aside>
    </>
  );
}
