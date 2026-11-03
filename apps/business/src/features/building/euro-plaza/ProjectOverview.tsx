import { ProjectHero } from "./ProjectHero";
import { Suspense } from "react";
import { MasterplanSection } from "./masterplan/MasterplanSection";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { asset, projectAdvantages } from "./content";
export function ProjectOverview() {
  return (
    <>
      <ProjectHero
        image={asset("vision.png")}
        imageAlt="Орон сууцны цогцолборын ерөнхий төлөвлөлтийн дүрслэл"
        eyebrow="ЕВРО ПЛАЗА · MGL ХОТХОН"
        title={
          <>
            Амьдралын
            <br />
            <span>шинэ орон зай.</span>
          </>
        }
        description={
          <>
            Хотын хэмнэл. Гэрийн тав тух.
            <br />
            Амьдрал, үйлчилгээ нэг дор.
          </>
        }
        location="УЛААНБААТАР · 3, 4-Р ХОРООЛОЛ"
      />
      <section className="euro-facts" aria-label="Төслийн гол үзүүлэлтүүд">
        {[
          ["16", "ДАВХАР"],
          ["195", "ТАНИЛЦУУЛГАД ЗААСАН АЙЛ"],
          ["7", "ТӨЛӨВЛӨЛТИЙН ТӨРӨЛ"],
          ["34.26–71.37", "М² СОНГОЛТ"],
        ].map(([value, label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>
      <section id="about" className="euro-section euro-about">
        <div>
          <p className="euro-eyebrow">01 / ТӨСЛИЙН ТУХАЙ</p>
          <h2>
            Өдөр бүрийн хэрэгцээ.
            <br />
            <span>Нэг цогц орчин.</span>
          </h2>
          <p>
            Евро Плаза нь 3, 4-р хорооллын бүсэд орон сууц, худалдаа, үйлчилгээ,
            оффисыг нэг дор төлөвлөсөн төсөл юм. Орчин үеийн архитектур, тав
            тухтай амьдрал, бизнесийн боломжийг хослуулна.
          </p>
          <a
            href={asset("introduction.jpeg")}
            className="euro-text-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            Төслийн танилцуулга <ArrowUpRight size={18} />
          </a>
        </div>
        <figure>
          <Image
            src={asset("aerial.jpeg")}
            alt="MGL хотхоны орчны дүрслэл"
            width={1170}
            height={846}
            sizes="(max-width:760px) 100vw, 50vw"
          />
          <figcaption>Хотхоны орчны дүрслэл</figcaption>
        </figure>
      </section>
      <section id="masterplan" className="euro-section euro-masterplan">
        <div className="euro-section-heading">
          <div>
            <p className="euro-eyebrow">02 / ЕРӨНХИЙ ТӨЛӨВЛӨЛТ</p>
            <h2>
              Амьдрахад ойр.
              <br />
              Бүхэнд ойр.
            </h2>
          </div>
          <p>
            Орон сууц, үйлчилгээ, ногоон орчин
            <br />
            нэгдсэн төлөвлөлтөд.
          </p>
        </div>
        <Suspense
          fallback={
            <div className="masterplan-loading" role="status">
              Блок, давхрын мэдээлэл ачаалж байна…
            </div>
          }
        >
          <MasterplanSection />
        </Suspense>
        <div className="euro-advantages">
          {projectAdvantages.map((item, index) => (
            <article key={item.title}>
              <span>0{index + 1}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
