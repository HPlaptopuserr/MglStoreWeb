import Image from "next/image";
import { roles } from "../content/intro-content";

export function RoleSection() {
  return (
    <section
      id="teams"
      className="intro-section role-section"
      aria-labelledby="roles-title"
    >
      <div className="center-heading">
        <p className="intro-eyebrow">02 / ХЭНД ЗОРИУЛСАН БЭ?</p>
        <h2 id="roles-title">
          Нэг баг. Өөр өөр ажил.
          <br />
          <em>Хүн бүрд өөрийн орчин.</em>
        </h2>
        <p>Байгууллагын ажил оффисоор хязгаарлагдахгүй.</p>
      </div>
      <div className="audience-panel">
        <div className="role-list">
          {roles.map((role, index) => (
            <article key={role.title}>
              <span className="step-number">0{index + 1}</span>
              <div>
                <p className="role-tags">{role.tags}</p>
                <h3>{role.title}</h3>
                <p>{role.text}</p>
              </div>
            </article>
          ))}
        </div>
        <figure className="mobile-visual">
          <Image
            src="/images/business/mobile-workspace.png"
            alt="Утасны касс, хүргэлтийн маршрут, багийн чат бүхий мобайл ажлын орчны концепц"
            width={1376}
            height={768}
            sizes="(max-width: 700px) 100vw, 650px"
          />
          <figcaption>Мобайл ажлын орчны концепц дүрслэл</figcaption>
          <div className="mobile-tags">
            <span>POS · Бараа</span>
            <span>Маршрут · Хүргэлт</span>
            <span>Багийн чат</span>
          </div>
        </figure>
      </div>
      <p className="role-footnote">
        Үйлчилгээний хүртээмж нь байгууллагын идэвхжүүлсэн боломж, ажилтны үүрэг
        болон олгосон эрхээс хамаарна.
      </p>
    </section>
  );
}
