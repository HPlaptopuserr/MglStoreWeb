import Image from "next/image";
import { ArrowDown, ArrowUpRight } from "lucide-react";
export function ProjectHero() {
  return (
    <>
      <section className="residence-hero">
        <Image
          src="/building/urgoo-concept.webp"
          alt="Өргөө 16 жишээ төслийн AI концепц рендер"
          fill
          priority
          sizes="100vw"
          className="residence-hero-image"
        />
        <div className="residence-hero-shade" />
        <div className="residence-hero-content">
          <p className="residence-eyebrow">
            <span />
            АМЬДРАЛЫН ДАРААГИЙН ХУУДАС
          </p>
          <h1>
            Таны орон зай.
            <br />
            <em>Таны шинэ эхлэл.</em>
          </h1>
          <p className="residence-hero-description">
            Амьдрах гэр, бизнесийн орон зай.
            <br />
            Өдөр тутмын хэрэгцээ — нэг барилгад.
          </p>
          <div className="residence-hero-actions">
            <a className="residence-button" href="#choose-floor">
              Өөрийн байраа сонгох
              <ArrowUpRight size={19} />
            </a>
            <a className="residence-text-link" href="#about">
              Төсөлтэй танилцах
              <ArrowDown size={15} />
            </a>
          </div>
        </div>
        <div className="residence-hero-bottom">
          <span>01 / ӨРГӨӨ 16</span>
          <span>AI концепц зураг · Жишээ төсөл</span>
          <a href="#about" aria-label="Төслийн мэдээлэл рүү доошлох">
            <ArrowDown size={18} />
          </a>
        </div>
      </section>
      <section className="residence-facts" aria-label="Төслийн тоон мэдээлэл">
        {[
          ["16", "ДАВХАР БАРИЛГА"],
          ["52", "ОРОН СУУЦ"],
          ["33–90", "М² ТАЛБАЙН СОНГОЛТ"],
          ["1,200", "М² ҮЙЛЧИЛГЭЭНИЙ ТАЛБАЙ"],
        ].map(([value, label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>
    </>
  );
}
