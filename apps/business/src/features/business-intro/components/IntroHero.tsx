import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { WorkspacePreview } from "./WorkspacePreview";

export function IntroHero() {
  return (
    <section className="intro-hero" aria-labelledby="intro-title">
      <div className="hero-copy">
        <p className="intro-eyebrow">
          <span /> MGL BUSINESS · АЖЛЫН НЭГДСЭН ОРЧИН
        </p>
        <h1 id="intro-title">
          Бизнесийн өдөр
          <br />
          тутмын ажил.
          <br />
          <em>Нэг апп дотор.</em>
        </h1>
        <p className="intro-lead">
          Багийн ирцээс барааны захиалга, борлуулалтаас хүргэлт хүртэл. Хүн бүр
          өөрийн хийх ажилтай, удирдлага нэгтгэн харах боломжтой.
        </p>
        <div className="intro-actions">
          <Link href="/attendance" className="intro-button">
            Цаг удирдлага руу <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
          <a href="#services" className="intro-text-link">
            Үйлчилгээнүүд <ArrowDown size={16} aria-hidden="true" />
          </a>
        </div>
        <ul className="hero-highlights">
          <li>
            <strong>Нэг орчин</strong>
            <span>Багийн өдөр тутмын ажил</span>
          </li>
          <li>
            <strong>Өөрийн эрх</strong>
            <span>Үүрэгт тохирсон боломж</span>
          </li>
          <li>
            <strong>Вэб + Апп</strong>
            <span>Удирдлагаас талбай хүртэл</span>
          </li>
        </ul>
      </div>
      <WorkspacePreview />
    </section>
  );
}
