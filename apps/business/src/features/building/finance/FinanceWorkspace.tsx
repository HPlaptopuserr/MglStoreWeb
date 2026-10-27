"use client";
import { useState } from "react";
import Link from "next/link";
import { useBuildingProjects } from "../management/useBuildingProjects";
import { useFinanceDashboard } from "./useFinanceDashboard";
import { FinanceSummary } from "../dashboard/FinanceSummary";
import { CashFlowSummary } from "../dashboard/CashFlowSummary";
import { OverdueTable } from "../dashboard/OverdueTable";
import { currency } from "../dashboard/model";
import "../dashboard/dashboard.css";
import "./finance.css";

export function FinanceWorkspace({ mode }: { mode: "overdue" | "reports" }) {
  const [project, setProject] = useState("");
  const { projects } = useBuildingProjects(true);
  const { data, loading, error, reload } = useFinanceDashboard(project);
  return <div className="erp-dashboard finance-workspace">
    <header className="finance-heading"><div><p className="erp-eyebrow">САНХҮҮГИЙН УДИРДЛАГА</p><h1>{mode === "overdue" ? "Хугацаа хэтэрсэн авлагын хяналт" : "Санхүү, орлого ба борлуулалтын тайлан"}</h1><p>Бүртгэлтэй гэрээ, баталгаажсан төлөлтөд үндэслэв.</p></div><div className="erp-filters"><select aria-label="Төсөл" value={project} onChange={event => setProject(event.target.value)}><option value="">Бүх төсөл</option>{projects.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select><button onClick={reload} disabled={loading}>Шинэчлэх</button>{mode === "reports" && <button onClick={() => window.print()} disabled={!data}>PDF / Хэвлэх</button>}</div></header>
    {loading && <p role="status" className="erp-card finance-state">Мэдээлэл ачаалж байна…</p>}
    {error && <div role="alert" className="erp-card finance-state">{error} <button onClick={reload}>Дахин оролдох</button></div>}
    {data && <>
      {mode === "overdue" ? <>
        <div className="finance-aging">{[{ label: "Нийт хэтэрсэн", min: 0, max: Infinity }, { label: "1–7 хоног", min: 1, max: 7 }, { label: "8–30 хоног", min: 8, max: 30 }, { label: "31–60 хоног", min: 31, max: 60 }, { label: "61+ хоног", min: 61, max: Infinity }].map(bucket => {
          const rows = data.overdue.filter(row => row.days >= bucket.min && row.days <= bucket.max);
          return <article className="erp-card" key={bucket.label}><span>{bucket.label}</span><strong>{currency(rows.reduce((sum, row) => sum + Number(row.amount), 0))}</strong><small>{rows.length} төлөх хуваарь</small></article>;
        })}</div>
        <OverdueTable rows={data.overdue} />
      </> : <>
        <FinanceSummary finance={data.finance} overdueContracts={new Set(data.overdue.map(row => row.reference)).size} />
        <div className="finance-report-grid"><CashFlowSummary finance={data.finance} /><section className="erp-card finance-definition"><p className="erp-eyebrow">ТООЦООЛЛЫН ТАЙЛБАР</p><h2>Хуваарь ба бодит төлөлт</h2><p>Нийт төлөгдсөн дүн нь баталгаажсан гүйлгээний нийлбэр. Сарын биелэлт нь энэ сард төлөх хуваарийн төлөвт үндэслэнэ.</p><p>Энэ тайлан нийт бүртгэлийг хамарна. Сарын мөнгөн орлогын гүйлгээний тайлантай адилтгаж болохгүй.</p><Link href="/building/manage/customers">Харилцагчийн төлөлтийн түүх →</Link></section></div>
        <section className="erp-card"><div className="erp-section-heading"><h2>Төсөл, блокийн борлуулалтын гүйцэтгэл</h2></div><div className="erp-table-scroll"><table><thead><tr><th>Төсөл / блок</th><th>Давхар</th><th>Нийт байр</th><th>Зарагдсан</th><th>Боломжтой</th><th>Гүйцэтгэл</th></tr></thead><tbody>{data.blocks.map(block => <tr key={block.id}><td><strong>{block.projectTitle}</strong><small>{block.name}</small></td><td>{block.floors}</td><td>{block.total}</td><td>{block.sold}</td><td>{block.available}</td><td><progress max={Math.max(block.total, 1)} value={block.sold} /> {block.total ? (block.sold / block.total * 100).toFixed(1) : 0}%</td></tr>)}</tbody></table></div>{!data.blocks.length && <p className="finance-state">Блок бүртгэгдээгүй байна.</p>}</section>
      </>}
      <p className="erp-note">Шинэчилсэн: {new Date(data.updatedAt).toLocaleString("mn-MN", { timeZone: "Asia/Ulaanbaatar" })}</p>
    </>}
  </div>;
}
