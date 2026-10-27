"use client";

import { useState } from "react";
import { formatUnitPrice } from "./unit-detail-model";

export function UnitPaymentOptions({ total, terms, phone }: {
  total: number | null;
  terms: string;
  phone: string;
}) {
  const [mode, setMode] = useState<"full" | "installments">("full");
  const [percent, setPercent] = useState(30);
  const [months, setMonths] = useState(12);
  const down = total === null ? null : Math.round(total * percent) / 100;
  const balance = total === null || down === null ? null : total - down;
  return <section id="unit-payment" className="unit-information-section unit-payment-options">
    <header className="unit-section-title"><div><p className="unit-detail-eyebrow">САНХҮҮГЭЭ ТӨЛӨВЛӨХ</p><h2>Үнэ болон төлбөрийн нөхцөл</h2></div><span>Таны сонголтод тохирох төлөвлөгөө</span></header>
    <div className="unit-payment-tabs" aria-label="Тооцооллын төрөл">
      <button type="button" aria-pressed={mode === "full"} onClick={() => setMode("full")}>01 · Бүрэн төлөлт</button>
      <button type="button" aria-pressed={mode === "installments"} onClick={() => setMode("installments")}>02 · Хуваан төлөх тооцоолуур</button>
    </div>
    <div className="unit-payment-panel">
      <div><p className="unit-detail-eyebrow">{mode === "full" ? "БҮРТГЭЛТЭЙ НИЙТ ҮНЭ" : "ТӨЛӨВЛӨГӨӨНИЙ ТООЦОО"}</p><h3>{formatUnitPrice(total)}</h3>
        <p>{terms || "Төлбөрийн дэлгэрэнгүй нөхцөлийг борлуулалтын ажилтнаас тодруулна уу."}</p>
        {mode === "installments" && <div className="unit-calculator-fields">
          <label>Урьдчилгаа · {percent}%<input type="range" min={0} max={100} step={5} value={percent} onChange={event => setPercent(Number(event.target.value))} /></label>
          <label>Хуваах хугацаа<select value={months} onChange={event => setMonths(Number(event.target.value))}>{[3, 6, 12, 18, 24, 36].map(value => <option key={value} value={value}>{value} сар</option>)}</select></label>
        </div>}
      </div>
      <aside className="unit-payment-result" aria-live="polite"><p>{mode === "full" ? "Нийт төлөх дүн" : "Сард төлөх үндсэн дүн ≈"}</p><strong>{formatUnitPrice(mode === "full" ? total : balance === null ? null : Math.round(balance / months))}</strong>
        {mode === "installments" && <dl><div><dt>Урьдчилгаа</dt><dd>{formatUnitPrice(down)}</dd></div><div><dt>Үлдэх дүн</dt><dd>{formatUnitPrice(balance)}</dd></div><div><dt>Хугацаа</dt><dd>{months} сар</dd></div></dl>}
        <p className="unit-calculator-note">{mode === "installments" ? "Зөвхөн төлөвлөх тооцоо. Хүү, шимтгэл ороогүй. Хуваан төлөх боломж, эцсийн нөхцөлийг борлуулалтын ажилтантай баталгаажуулна." : "Хөнгөлөлт болон эцсийн үнийг борлуулалтын ажилтантай баталгаажуулна."}</p>
        {phone && <a href={`tel:${phone.replace(/[^+\d]/g, "")}`}>Төлбөрийн нөхцөл лавлах ↗</a>}
      </aside>
    </div>
  </section>;
}
