import { services } from "./content";
import { ServiceCard } from "./ServiceCard";

export function ServiceCatalog() {
  return (
    <section
      id="services"
      className="intro-section"
      aria-labelledby="services-title"
    >
      <div className="section-heading">
        <div>
          <p className="intro-eyebrow">01 / ҮЙЛЧИЛГЭЭНҮҮД</p>
          <h2 id="services-title">
            Ажил бүрд тохирсон
            <br />
            өөрийн гэсэн орчин.
          </h2>
        </div>
        <p>
          Байгууллагын тохиргоо болон ажилтны эрхэд тохируулан ашиглах
          үйлчилгээнүүд.
        </p>
      </div>
      <div className="service-grid">
        {services.map((service, index) => (
          <ServiceCard key={service.id} service={service} number={index + 1} />
        ))}
      </div>
      <aside className="intro-extra">
        <strong>Ажлын завсарлага ч бас бий.</strong>
        <p>
          Аппын тоглоомын хэсэгт 2048, Block Blast, дартсын оноо тооцоолуур,
          азын хүрд болон онооны жагсаалт багтсан.
        </p>
      </aside>
    </section>
  );
}
