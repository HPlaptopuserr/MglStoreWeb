import Link from "next/link";
import { IntroBrand } from "./IntroBrand";
export function IntroFooter() {
  return (
    <footer className="intro-footer">
      <div className="footer-top">
        <div>
          <IntroBrand />
          <p>
            Монгол бизнесийн өдөр тутмын
            <br />
            ажлын нэгдсэн орчин.
          </p>
        </div>
        <nav aria-label="Үйлчилгээний холбоос">
          <strong>ҮЙЛЧИЛГЭЭНҮҮД</strong>
          <Link href="/attendance">Цаг удирдлага ↗</Link>
          <a href="#services">Бүх үйлчилгээ</a>
          <Link href="/building">Барилгын төслүүд ↗</Link>
        </nav>
        <nav aria-label="Мэдээллийн холбоос">
          <strong>МЭДЭЭЛЭЛ</strong>
          <a href="#teams">Хэнд зориулсан бэ?</a>
          <a href="#contact">Холбогдох</a>
          <a href="https://mglstore.mn">MGL Store ↗</a>
        </nav>
        <div className="footer-contact">
          <strong>ХОЛБОО БАРИХ</strong>
          <a href="mailto:info@mglstore.mn">info@mglstore.mn</a>
          <span>Монгол улс · Улаанбаатар</span>
        </div>
      </div>
      <div className="footer-bottom">
        <span>
          © 2026 MGL BMBCH DIGITAL LLC. Зохиогчийн эрх хамгаалагдсан.
        </span>
        <span>Бизнесийн өдөр тутмын ажил. Нэг апп дотор.</span>
      </div>
    </footer>
  );
}
