"use client";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useBuildingProjects } from "../management/useBuildingProjects";
import { currency } from "../dashboard/model";
import { useMonthlyPayments } from "./useMonthlyPayments";
import { MonthlyPaymentMetrics } from "./MonthlyPaymentMetrics";
import { MonthlyPaymentChart } from "./MonthlyPaymentChart";
import { MonthlyPaymentTable } from "./MonthlyPaymentTable";
import "./payments.css";

export function PaymentsWorkspace() {
  const [today] = useState(() => new Date(Date.now() + 8 * 3600000));
  const [year, setYear] = useState(today.getUTCFullYear());
  const [month, setMonth] = useState(today.getUTCMonth() + 1);
  const [project, setProject] = useState("");
  const { projects, error: projectError } = useBuildingProjects(true);
  const { data, error, loading, reload } = useMonthlyPayments(year, project);
  return (
    <div className="building-payments-workspace">
      <header className="payment-workspace-heading">
        <div>
          <p>ТӨЛБӨРИЙН ХЯНАЛТ</p>
          <h1>Төлөлт ба сарын орлого</h1>
          <span>Сар бүр хэд орж ирэх ёстой, хэд орсныг нэг дор хянах</span>
        </div>
        <button type="button" disabled={loading} onClick={reload}>
          <RefreshCw size={15} /> Шинэчлэх
        </button>
      </header>
      <div className="payment-report-filters">
        <label>
          Төсөл
          <select
            value={project}
            onChange={(event) => setProject(event.target.value)}
          >
            <option value="">Бүх төсөл</option>
            {projects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Он
          <select
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
          >
            {Array.from(
              { length: Math.min(2100, today.getUTCFullYear() + 10) - 1999 },
              (_, index) => 2000 + index,
            )
              .reverse()
              .map((value) => (
                <option key={value} value={value}>
                  {value} он
                </option>
              ))}
          </select>
        </label>
        <label>
          Сар
          <select
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
          >
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index} value={index + 1}>
                {index + 1}-р сар
              </option>
            ))}
          </select>
        </label>
      </div>
      {projectError && (
        <p className="payment-report-warning" role="alert">
          Төслийн жагсаалт: {projectError}
        </p>
      )}
      {loading ? (
        <div className="payment-report-empty" role="status">
          Сарын төлөлтийн мэдээлэл ачаалж байна…
        </div>
      ) : error ? (
        <div className="payment-report-empty" role="alert">
          <p>{error}</p>
          <button type="button" onClick={reload}>
            Дахин оролдох
          </button>
        </div>
      ) : (
        data && (
          <>
            <MonthlyPaymentMetrics data={data} month={month} />
            {data.undated.count > 0 && (
              <p className="payment-report-warning" role="status">
                Төлсөн огноо дутуу {data.undated.count} баталгаажсан төлбөр (
                {currency(data.undated.amount)}) байна. Огноогүй төлбөрийг сарын
                орлогод оруулаагүй.
              </p>
            )}
            {data.months.every(
              (item) =>
                Number(item.expected) === 0 && Number(item.received) === 0,
            ) && (
              <div className="payment-report-empty">
                <h2>Энэ онд төлбөрийн хөдөлгөөн бүртгэгдээгүй байна</h2>
                <p>
                  Өөр он, төсөл сонгох эсвэл гэрээний төлбөрийн хуваариа
                  бүртгэнэ үү.
                </p>
              </div>
            )}
            <MonthlyPaymentChart
              months={data.months}
              month={month}
              onMonth={setMonth}
            />
            <MonthlyPaymentTable data={data} month={month} onMonth={setMonth} />
            <footer className="payment-report-note">
              <p>
                Орох ёстой дүнг төлөх хуваарийн хугацаагаар, бодит орлогыг PAID
                төлөвтэй төлбөрийн төлсөн огноогоор тооцов. Урьдчилж болон
                хоцорч төлсөн орлого өөр сарын хуваарьт хамаарч болно. Хуваарийн
                үлдэгдэл нь орлогын зөрүүгээс тусдаа үзүүлэлт.
              </p>
              <p>
                Идэвхтэй болон гэрээнд шилжсэн захиалгууд · Улаанбаатар (UTC+8)
                · Шинэчилсэн:{" "}
                {new Date(data.updatedAt).toLocaleString("mn-MN", {
                  timeZone: "Asia/Ulaanbaatar",
                })}
              </p>
            </footer>
          </>
        )
      )}
    </div>
  );
}
