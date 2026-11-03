import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  ChartNoAxesCombined,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";

const highlights = [
  { icon: Users, title: "Багийн мэдээлэл", text: "Ажилтан, хэлтэс, эрх" },
  {
    icon: ChartNoAxesCombined,
    title: "Ирцийн тайлан",
    text: "Гүйцэтгэл, цагийн нэгтгэл",
  },
  {
    icon: MapPin,
    title: "Байршлын бүс",
    text: "Ирц бүртгэх зөвшөөрөгдсөн бүс",
  },
  {
    icon: ShieldCheck,
    title: "Эрхийн удирдлага",
    text: "Байгууллагын хүрээнд",
  },
];

export function ProductShowcase() {
  return (
    <section
      className="product-showcase intro-section"
      aria-labelledby="showcase-title"
    >
      <div className="section-heading">
        <div>
          <p className="intro-eyebrow">УДИРДЛАГЫН ОРЧИН</p>
          <h2 id="showcase-title">
            Удирдлагын нэгдсэн
            <br />
            <em>вэб самбар.</em>
          </h2>
        </div>
        <div>
          <p>Ирц, хүсэлт, хуваарь болон ажлын тайлангаа нэг дор хянаарай.</p>
          <Link className="intro-text-link" href="/attendance">
            Удирдлагын хэсэг нээх <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <figure className="product-visual">
        <div className="visual-toolbar">
          <span>
            <i /> MGL Business · Workspace
          </span>
          <span>Концепц дүрслэл</span>
        </div>
        <Image
          src="/images/business/workspace-dashboard.png"
          alt="Багийн ирц, газрын зураг, барааны үлдэгдэл, борлуулалтыг нэгтгэсэн бараан самбарын концепц"
          width={1376}
          height={768}
          sizes="(max-width: 700px) 100vw, 1200px"
        />
        <figcaption>
          Бүтээгдэхүүний чиглэлийг харуулсан концепц. Зураг дахь нэр, тоон
          мэдээлэл нь жишиг болно.
        </figcaption>
      </figure>
      <div className="showcase-highlights">
        {highlights.map(({ icon: Icon, title, text }) => (
          <div key={title}>
            <Icon size={21} aria-hidden="true" />
            <span>
              <strong>{title}</strong>
              <small>{text}</small>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
