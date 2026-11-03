import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import styles from "./club-design.module.css";
export function ClubCommunitySections() {
  return (
    <>
      <section id="about" className={styles.principles}>
        <ShieldCheck size={31} />
        <div>
          <h2>Итгэлцэлд суурилсан хамтын ажиллагаа</h2>
          <p>
            Мэдээллээ үнэн зөв оруулж, хамтрагчдаа хүндэтгэн, үнэ болон худалдан
            авалтын нөхцөлөө шууд тохиролцоорой. Туршилтын гишүүд тусгай
            тэмдэглэгээтэй.
          </p>
        </div>
      </section>
      <section className={styles.joinSection}>
        <div className={styles.joinBanner}>
          <div>
            <span>БИЗНЕСЭЭ ТЭЛЭХ АЛХАМ</span>
            <h2>MGL CLUB бизнесийн нийгэмлэгт бүртгүүлэх</h2>
            <p>
              Бизнесээ нэг удаа бүртгүүлээд, 21 аймаг даяарх бизнес эрхлэгчидтэй
              холбогдож, бүтээгдэхүүн үйлчилгээгээ санал болгоорой.
            </p>
            <small>
              ✓ Бизнесийн танилцуулга　 ✓ Шууд харилцаа холбоо　 ✓ Харилцан
              худалдан авалт
            </small>
          </div>
          <Link href="/mgl-club/join">
            Одоо бүртгүүлэх <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>
    </>
  );
}
