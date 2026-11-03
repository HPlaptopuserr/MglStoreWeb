import Image from "next/image";
import { ArrowUpRight, CarFront, House, Store, Warehouse } from "lucide-react";
import Link from "next/link";
export function ProjectAbout() {
  return (
    <section id="about" className="residence-section residence-about">
      <div className="residence-about-image">
        <Image
          src="/building/urgoo-concept.webp"
          alt="Барилгын фасад, үйлчилгээний хэсгийн концепц"
          fill
          sizes="(max-width: 760px) 100vw, 45vw"
        />
        <span>URGOO / 16</span>
      </div>
      <div className="residence-about-copy">
        <p className="residence-eyebrow">01 — ТӨСЛИЙН ТУХАЙ</p>
        <h2>
          Нэг барилга.
          <br />
          <em>Дөрвөн боломж.</em>
        </h2>
        <p>
          1–3 давхрын үйлчилгээний төвөөс 4–16 давхрын орон сууц хүртэл. Өөрийн
          хэрэгцээнд тохирох талбайг давхар, өрөө, борлуулалтын төлөвөөр нь
          сонгоорой.
        </p>
        <div className="residence-amenities">
          {[
            {
              icon: House,
              title: "52 орон сууц",
              text: "Давхар бүр 4 төрлийн байр",
              floor: 14,
            },
            {
              icon: Store,
              title: "3 үйлчилгээний давхар",
              text: "Давхар бүр 400 м²",
              floor: 1,
            },
            {
              icon: Warehouse,
              title: "1,000 дулаан гарааш",
              text: "B1 болон B2 давхар",
              floor: -1,
            },
            {
              icon: CarFront,
              title: "1,000 гадна зогсоол",
              text: "Гадна талбайн зогсоол",
              floor: 0,
            },
          ].map((item) => (
            <Link key={item.title} href={`/building/demo?floor=${item.floor}`}>
              <item.icon size={22} strokeWidth={1.3} />
              <div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
              <ArrowUpRight size={16} />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
