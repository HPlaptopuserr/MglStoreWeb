import type { WebsiteProject } from "@mgl/types/building-website";

export function UnitInformationSections({ project }: { project: WebsiteProject }) {
  const content = project.website.content;
  return <>
    <section id="unit-project" className="unit-information-section">
      <header className="unit-section-title"><div><p className="unit-detail-eyebrow">ХОТХОНЫ ТУХАЙ</p><h2>{content.aboutTitle || project.title}</h2></div></header>
      <p>{content.aboutText || "Хотхоны дэлгэрэнгүй танилцуулга удахгүй нэмэгдэнэ."}</p>
      {content.completionLabel && <p>Ашиглалтад орох хугацаа: <strong>{content.completionLabel}</strong></p>}
      {content.amenities.length > 0 && <div className="unit-amenities">{content.amenities.map((item, index) => <article key={`${item.title}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><h3>{item.title}</h3><p>{item.description}</p></article>)}</div>}
      {content.faqs.length > 0 && <div className="unit-faqs">{content.faqs.map((item, index) => <details key={index}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div>}
    </section>
  </>;
}
