import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Phone } from "lucide-react";
import { asset, commercialFloors, salesPhones } from "./content";
export function ProjectContact() {
  return (
    <>
      <section id="mall" className="euro-section euro-mall">
        <div className="euro-section-heading">
          <div>
            <p className="euro-eyebrow">04 / ХУДАЛДАА & ҮЙЛЧИЛГЭЭ</p>
            <h2>
              Таны бизнесийн
              <br />
              <span>шинэ хаяг. MGL Mall.</span>
            </h2>
          </div>
          <p>
            Худалдаа, үйлчилгээ, өдөр тутмын
            <br />
            хэрэглээг нэг дор төвлөрүүлсэн орчин.
          </p>
        </div>
        <p className="euro-note">Доорх нь эх танилцуулгын мэдээлэл. Шинэчилсэн зориулалтаар 1–4-р давхар үйлчилгээний төв, 5–16-р давхар орон сууц.</p>
        <div className="euro-commercial-grid">
          {commercialFloors.map((item) => (
            <article key={item.floor}>
              <span>{item.floor}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              {item.note && <small>{item.note}</small>}
            </article>
          ))}
        </div>
        <details className="euro-source">
          <summary>Үйлчилгээний талбайн эх танилцуулгыг харах</summary>
          <Image
            src={asset("mall.jpeg")}
            alt="MGL Mall үйлчилгээний давхруудын танилцуулга"
            width={1081}
            height={590}
            sizes="(max-width:760px) 100vw, 75vw"
          />
        </details>
      </section>
      <section className="euro-section euro-faq">
        <p className="euro-eyebrow">ТҮГЭЭМЭЛ АСУУЛТ</p>
        <h2>Танд хэрэгтэй мэдээлэл.</h2>
        <details>
          <summary>Ямар талбайтай байрнууд байгаа вэ?</summary>
          <p>
            1 өрөө: 34.26, 36.88 м². 2 өрөө: 49.32, 51.90, 53.63 м². 3 өрөө:
            60.98, 71.37 м².
          </p>
        </details>
        <details>
          <summary>Үнэ, төлбөрийн нөхцөлийг хэрхэн авах вэ?</summary>
          <p>
            Борлуулалтын {salesPhones.join(", ")} дугаараар холбогдон тухайн
            байрны үнэ, боломжит давхар, төлбөрийн нөхцөлийг лавлана уу.
          </p>
        </details>
        <details>
          <summary>Орон сууц хэддүгээр давхарт байрлах вэ?</summary>
          <p>
            Байрны төлөвлөлтийн зургууд дээр 4–16-р давхар гэж тэмдэглэсэн.
            2023 оны ажлын зурагт 5–10-р давхар бүр 14 айл, 11–16-р давхар бүр 12 айл буюу нийт 156 айл байна. Танилцуулгын 195 айлтай зөрүүтэй.
          </p>
        </details>
      </section>
      <section id="contact" className="euro-section euro-contact">
        <p className="euro-eyebrow">ДАРААГИЙН АЛХМАА ХАМТДАА</p>
        <h2>
          Шинэ эхлэлээ
          <br />
          <span>эндээс олоорой.</span>
        </h2>
        <p>Борлуулалтын албатай холбогдох</p>
        <div>
          {salesPhones.map((phone) => (
            <a className="euro-button" key={phone} href={`tel:${phone}`}>
              <Phone size={18} />
              {phone.slice(0, 4)} {phone.slice(4)}
              <ArrowUpRight size={18} />
            </a>
          ))}
        </div>
      </section>
      <footer className="euro-footer">
        <Link href="/building">
          ЕВРО ПЛАЗА <span> / MGL PROPERTY</span>
        </Link>
        <span>Орон сууц · Худалдаа · Үйлчилгээ</span>
        <Link href="/building/manage/content">Удирдлага ↗</Link>
      </footer>
    </>
  );
}
