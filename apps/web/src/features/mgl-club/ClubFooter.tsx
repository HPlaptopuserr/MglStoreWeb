import Link from "next/link";
import { ClubBrand } from "./ClubBrand";
import styles from "./club-design.module.css";
export function ClubFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        <div>
          <ClubBrand />
          <p>
            Монголын бизнес эрхлэгчдийн B2B худалдаа, хамтын ажиллагааны нэгдсэн
            талбар.
          </p>
        </div>
        <div>
          <h3>Хамтын сүлжээ</h3>
          <Link href="/mgl-club#club-directory">21 аймгийн гишүүд</Link>
          <Link href="/mgl-club#club-directory">Улаанбаатар хот</Link>
          <Link href="/mgl-club#needs-hub">Хэрэгцээ & Зарууд</Link>
        </div>
        <div>
          <h3>Клуб & Дүрэм</h3>
          <Link href="/mgl-club#about">Гишүүнчлэлийн зарчим</Link>
          <Link href="/mgl-club#benefits">Клубийн давуу тал</Link>
          <Link href="/mgl-club/join">Бизнесээ бүртгүүлэх</Link>
        </div>
        <div>
          <h3>Хамтдаа өсөцгөөе</h3>
          <p>
            Үйлчилгээгээ санал болгож, өөрт хэрэгтэй хамтрагчаа орон нутгаасаа
            олоорой.
          </p>
          <Link href="/">MGL Store руу очих ↗</Link>
        </div>
      </div>
      <div className={styles.copyright}>
        © {new Date().getFullYear()} MGL CLUB · Бизнесийн хамтын нийгэмлэг
        <span>Танилцъя. Хамтаръя. Хамтдаа өсөцгөөе.</span>
      </div>
    </footer>
  );
}
