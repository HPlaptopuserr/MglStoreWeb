import { centsMoney, moneyCents, type PurchaseScheduleRow } from "@mgl/types";
import { currency } from "../dashboard/model";
export function PaymentScheduleEditor({
  total,
  rows,
  onChange,
}: {
  total: string;
  rows: PurchaseScheduleRow[];
  onChange?: (rows: PurchaseScheduleRow[]) => void;
}) {
  const amounts = rows.map((row) => {
    try {
      return Number(moneyCents(row.amount)) / 100;
    } catch {
      return 0;
    }
  });
  const max = Math.max(...amounts, 1);
  let sum = BigInt(0);
  for (const row of rows) {
    try {
      sum += moneyCents(row.amount);
    } catch {
      /* Invalid input is reported before save. */
    }
  }
  return (
    <section className="purchase-schedule">
      <h3>Төлөлтийн график</h3>
      <div
        className="purchase-graph"
        role="img"
        aria-label="Огноо тус бүрийн төлөх дүн. Доорх хүснэгтэд дэлгэрэнгүй байна."
      >
        {rows.map((row, i) => (
          <div key={i}>
            <span
              style={{ height: `${Math.max(3, (amounts[i] / max) * 100)}px` }}
              title={`${row.date}: ${currency(row.amount || "0")}`}
            />
            <small>{row.date.slice(5) || "Огноо"}</small>
          </div>
        ))}
      </div>
      <div className="purchase-schedule-table">
        <table>
          <thead>
            <tr>
              <th>Төлөх өдөр</th>
              <th>Төрөл</th>
              <th>Дүн</th>
              {onChange && <th>Үйлдэл</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td>
                  {onChange ? (
                    <input
                      aria-label={`${i + 1} төлөлтийн өдөр`}
                      type="date"
                      required
                      value={row.date}
                      onChange={(e) =>
                        onChange(
                          rows.map((r, n) =>
                            n === i ? { ...r, date: e.target.value } : r,
                          ),
                        )
                      }
                    />
                  ) : (
                    row.date
                  )}
                </td>
                <td>
                  {onChange ? (
                    <select
                      aria-label={`${i + 1} төлөлтийн төрөл`}
                      value={row.kind}
                      onChange={(e) =>
                        onChange(
                          rows.map((r, n) =>
                            n === i
                              ? {
                                  ...r,
                                  kind: e.target
                                    .value as PurchaseScheduleRow["kind"],
                                }
                              : r,
                          ),
                        )
                      }
                    >
                      <option value="DOWN_PAYMENT">Урьдчилгаа</option>
                      <option value="MONTHLY">Сарын төлөлт</option>
                      <option value="FULL_PAYMENT">Бүтэн төлөлт</option>
                    </select>
                  ) : (
                    {
                      DOWN_PAYMENT: "Урьдчилгаа",
                      MONTHLY: "Сарын төлөлт",
                      FULL_PAYMENT: "Бүтэн төлөлт",
                    }[row.kind]
                  )}
                </td>
                <td>
                  {onChange ? (
                    <input
                      aria-label={`${i + 1} төлөлтийн дүн`}
                      inputMode="decimal"
                      value={row.amount}
                      onChange={(e) =>
                        onChange(
                          rows.map((r, n) =>
                            n === i ? { ...r, amount: e.target.value } : r,
                          ),
                        )
                      }
                    />
                  ) : (
                    currency(row.amount)
                  )}
                </td>
                {onChange && (
                  <td>
                    <button
                      type="button"
                      disabled={rows.length === 1}
                      onClick={() => onChange(rows.filter((_, n) => n !== i))}
                    >
                      Хасах
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Хуваарийн нийлбэр: <b>{currency(centsMoney(sum))}</b> · Нийт үнэ:{" "}
        {currency(total || "0")}
      </p>
      {onChange && (
        <button
          type="button"
          disabled={rows.length >= 120}
          onClick={() =>
            onChange([...rows, { date: "", amount: "", kind: "MONTHLY" }])
          }
        >
          + Төлөлт нэмэх
        </button>
      )}
    </section>
  );
}
