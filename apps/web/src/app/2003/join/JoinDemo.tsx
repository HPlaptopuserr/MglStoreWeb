"use client";
import Link from "next/link";
import { DemoMemberForm } from "../community/_components/DemoMemberForm";
import { useDemoDirectory } from "../community/useDemoDirectory";
import styles from "../community/community.module.css";
export function JoinDemo() {
  const { addMember, ready, error } = useDemoDirectory();
  return (
    <div className={styles.page}>
      <div className={styles.demoBanner}>
        LOCAL DEMO · Зөвхөн зохиомол мэдээлэл оруулна уу.
      </div>
      <header className={styles.header}>
        <Link href="/2003" className={styles.logo}>
          2003
        </Link>
        <Link href="/2003" className={styles.primary}>
          ← Хүмүүсийг харах
        </Link>
      </header>
      <div className={styles.main}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>БИДНИЙ ХҮРЭЭЛЭЛД ТАВТАЙ МОРИЛ</p>
            <h1>
              Таны туршлага.
              <br />
              <span>Бидний боломж.</span>
            </h1>
            <p>
              Мэргэжлээс гадна одоогийн ажил, байршил, юугаар тусалж чадахаа
              хуваалцаарай.
            </p>
          </div>
          <aside className={styles.notice}>
            Энд нэмсэн танилцуулга зөвхөн энэ браузерын туршилтын жагсаалтад
            гарна. Бодит системд гишүүний баталгаажуулалт, нийтлэх зөвшөөрөл,
            админы хяналт нэмэгдэнэ.
          </aside>
        </section>
        {error && (
          <p role="alert" className={styles.notice}>
            {error}
          </p>
        )}
        {ready ? (
          <DemoMemberForm onAdd={addMember} />
        ) : (
          <p role="status">Бүртгэлийг бэлдэж байна…</p>
        )}
        <Link href="/2003" className={styles.primary}>
          Гишүүдийн жагсаалт руу →
        </Link>
      </div>
    </div>
  );
}
