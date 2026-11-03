const steps = [
  {
    title: "Байгууллагаа тодорхойлох",
    text: "Үйл ажиллагааны чиглэл, багийн бүтэц, ашиглах үйлчилгээгээ тодорхойлно.",
  },
  {
    title: "Багийн эрхийг тохируулах",
    text: "Удирдлага, ажилтан, кассчин, худалдааны төлөөлөгч, жолоочийн ажиллах хүрээг онооно.",
  },
  {
    title: "Өдөр тутмын ажлаа эхлүүлэх",
    text: "Ажилтан өөрт нээгдсэн хэсгээс ажлаа хийж, удирдлага явцыг хянана.",
  },
] as const;
export function GettingStarted() {
  return (
    <section className="intro-section" aria-labelledby="start-title">
      <div className="center-heading">
        <p className="intro-eyebrow">03 / ЭХЛЭХЭД</p>
        <h2 id="start-title">Ашиглаж эхлэх дараалал</h2>
        <p>Хэрэгцээгээ тодорхойлоод, тохирох үйлчилгээгээ сонгоно.</p>
      </div>
      <ol className="steps-grid">
        {steps.map((step, index) => (
          <li key={step.title}>
            <span className="step-number">0{index + 1}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
