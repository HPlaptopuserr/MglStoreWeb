import { Plus } from "lucide-react";
import { questions } from "../content/intro-content";
export function IntroFaq() {
  return (
    <section className="intro-section faq-section" aria-labelledby="faq-title">
      <div className="center-heading">
        <p className="intro-eyebrow">04 / ТҮГЭЭМЭЛ АСУУЛТ</p>
        <h2 id="faq-title">Түгээмэл асуулт</h2>
        <p>Системтэй холбоотой асуултын хариултууд.</p>
      </div>
      <div className="faq-list">
        {questions.map((item) => (
          <details key={item.question}>
            <summary>
              {item.question}
              <Plus size={17} aria-hidden="true" />
            </summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
