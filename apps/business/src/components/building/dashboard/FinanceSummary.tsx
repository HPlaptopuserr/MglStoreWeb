import type { DashboardData } from './model';
import { currency, percentage } from './model';
export function FinanceSummary({finance:f}: {finance:DashboardData['finance']}) {
 return <section id="finance"><p className="erp-eyebrow">САНХҮҮГИЙН УДИРДЛАГА</p><h2>Гэрээний төлбөр & санхүүгийн гүйцэтгэл</h2>
 <div className="erp-finance-grid">
 <article className="erp-card"><span>Тохиролцсон үнийн нийт дүн</span><strong className="erp-value">{currency(f.agreed)}</strong><footer>Баталгаажсан орлого <b>{currency(f.paid)}</b><progress max={100} value={percentage(f.paid,f.agreed)}/></footer></article>
 <article className="erp-card"><span>Тооцоолсон нийт үлдэгдэл</span><strong className="erp-value">{currency(f.remaining)}</strong><footer>Энэ сарын хуваарь <b>{currency(f.due)}</b><br/>Хуваариас төлөгдсөн <b>{currency(f.monthPaid)}</b></footer></article>
 <article className="erp-card erp-danger"><span>Хугацаа хэтэрсэн төлбөр</span><strong className="erp-value">{currency(f.overdue)}</strong><footer><a href="#overdue">Хугацаа хэтэрсэн хуваарийг харах ↓</a></footer></article>
 </div><p className="erp-note">Идэвхтэй болон гэрээнд шилжсэн захиалгын бүртгэлээр тооцов. {f.reservations} бүртгэл. {f.missingPrices > 0 && `${f.missingPrices} бүртгэлд тохиролцсон үнэ дутуу.`}</p></section>;
}
