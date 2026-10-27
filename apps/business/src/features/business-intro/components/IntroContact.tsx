import { Mail, ShieldCheck } from "lucide-react";
import { ContactForm } from "./ContactForm";
export function IntroContact() {
  return (
    <section
      id="contact"
      className="intro-section intro-contact"
      aria-labelledby="contact-title"
    >
      <div>
        <p className="intro-eyebrow">ДАРААГИЙН АЛХАМ</p>
        <h2 id="contact-title">
          Танай багийн ажилд
          <br />
          <em>юу хэрэгтэй байна?</em>
        </h2>
        <p>
          Үйл ажиллагаагаа танилцуулаарай. Тохирох үйлчилгээнүүд болон ашиглаж
          эхлэх нөхцөлийг хамт тодруулъя.
        </p>
        <a className="contact-email" href="mailto:info@mglstore.mn">
          <Mail size={21} aria-hidden="true" />
          <span>
            <small>БИДЭНД БИЧИХ</small>
            <strong>info@mglstore.mn</strong>
          </span>
          <span aria-hidden="true">↗</span>
        </a>
        <p className="contact-assurance">
          <ShieldCheck size={17} aria-hidden="true" /> Танай байгууллагын
          хэрэгцээнд тохирсон шийдэл.
        </p>
      </div>
      <ContactForm />
    </section>
  );
}
