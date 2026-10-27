"use client";
import { useState } from "react";
import "../dashboard/dashboard.css";
import "../finance/finance.css";
import "./notifications.css";
const rules = [
  { id: "before7", day: "T − 7", title: "Төлөх өдрөөс 7 хоногийн өмнө" },
  { id: "before3", day: "T − 3", title: "Төлөх өдрөөс 3 хоногийн өмнө" },
  { id: "today", day: "T", title: "Төлөх өдөр" },
  { id: "after1", day: "T + 1", title: "Хугацаа 1 хоног хэтэрсэн" },
  { id: "after3", day: "T + 3", title: "Хугацаа 3 хоног хэтэрсэн" },
  { id: "after7", day: "T + 7", title: "Хугацаа 7 хоног хэтэрсэн" },
  { id: "paid", day: "✓", title: "Төлөлт баталгаажсан" },
];
export function NotificationWorkspace() {
  const [selected, setSelected] = useState("after7");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const rule = rules.find(item => item.id === selected) ?? rules[0];
  const defaultMessage = selected === "paid" ? "Эрхэм {Харилцагч}, таны {Дүн} ₮ төлөлт баталгаажлаа. Баярлалаа." : `Эрхэм {Харилцагч}, {Тоот} байрны төлбөрийн сануулга: ${rule.title}. Төлөх дүн: {Дүн} ₮. Төлөх огноо: {Огноо}.`;
  const message = drafts[selected] ?? defaultMessage;
  return <div className="erp-dashboard"><header className="finance-heading"><div><p className="erp-eyebrow">САНУУЛГА БА МЭДЭГДЭЛ</p><h1>Автомат сануулгын загвар</h1><p>Төлбөрийн мөчлөг бүрийн мессежийг урьдчилан харах</p></div></header>
    <div className="notification-warning" role="status"><strong>Илгээх үйлчилгээ холбогдоогүй</strong><p>SMS / email provider болон илгээлтийн хуваарь тохируулагдаагүй байна. Доорх нь загварын урьдчилсан харагдац; өөрчлөлт хадгалагдахгүй, мессеж илгээгдэхгүй.</p></div>
    <div className="notification-layout"><aside><div className="erp-card notification-guard"><h2>Төлөгдсөн үед сануулгыг зогсоох</h2><p>Автоматжуулалт холбох үед төлбөрийн бодит үлдэгдлийг шалгаж, төлөгдсөн хуваарийн сануулгыг цуцална.</p></div><h2>Төлбөрийн мөчлөг</h2><div className="notification-rules">{rules.map(item => <button type="button" aria-pressed={item.id === selected} key={item.id} onClick={() => setSelected(item.id)}><span>{item.day}</span><strong>{item.title}</strong><small>Загвар харах →</small></button>)}</div></aside>
      <section className="erp-card notification-editor"><p className="erp-eyebrow">SMS ЗАГВАР · УРЬДЧИЛСАН ХАРАГДАЦ</p><h2>{rule.title}</h2><div className="notification-variables">{["{Харилцагч}", "{Тоот}", "{Дүн}", "{Огноо}"].map(variable => <button key={variable} onClick={() => setDrafts({ ...drafts, [selected]: message + " " + variable })}>{variable}</button>)}</div><label>Мессежийн агуулга<textarea rows={8} maxLength={1500} value={message} onChange={event => setDrafts({ ...drafts, [selected]: event.target.value })} /></label><small>{message.length} тэмдэгт · Зөвхөн энэ дэлгэцийн ноорог</small><div className="notification-preview"><small>MGL PROPERTY · ЖИШЭЭ ХАРАГДАЦ</small><p>{message.replaceAll("{Харилцагч}", "Харилцагч").replaceAll("{Тоот}", "—").replaceAll("{Дүн}", "—").replaceAll("{Огноо}", "YYYY.MM.DD")}</p></div><button type="button" onClick={() => setDrafts({ ...drafts, [selected]: defaultMessage })}>Анхны загвар сэргээх</button></section>
    </div>
  </div>;
}
