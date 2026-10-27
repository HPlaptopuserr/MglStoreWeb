import type { PurchaseSnapshot } from "@mgl/types";
import { currency } from "../dashboard/model";
import { PaymentScheduleEditor } from "./PaymentScheduleEditor";
export function PurchaseContractDocument({
  snapshot: s,
  id,
}: {
  snapshot: PurchaseSnapshot;
  id?: string;
}) {
  return (
    <article className="purchase-document">
      <p className="erp-eyebrow">ОРОН СУУЦ, ТАЛБАЙ ЗАХИАЛГЫН ГЭРЭЭ</p>
      <h2>{id ? `№ ${id.slice(0, 8)}` : "Гэрээний төсөл"}</h2>
      <dl>
        <div>
          <dt>Худалдагч</dt>
          <dd>{s.seller}</dd>
        </div>
        <div>
          <dt>Худалдан авагч</dt>
          <dd>
            {s.customerName} · {s.buyerEmail}
            <br />
            {s.customerPhone}
          </dd>
        </div>
        <div>
          <dt>Үл хөдлөх хөрөнгө</dt>
          <dd>
            {s.project} / {s.block} / {s.floor}-р давхар / № {s.unitNo} ·{" "}
            {s.area ?? "—"} м²
          </dd>
        </div>
        <div>
          <dt>Тохиролцсон нийт үнэ</dt>
          <dd>{currency(s.total)}</dd>
        </div>
      </dl>
      <h3>Талуудын тохиролцсон нөхцөл</h3>
      <p className="purchase-terms">{s.terms}</p>
      <PaymentScheduleEditor total={s.total} rows={s.schedule} />
      <p className="purchase-note">
        Зөвшөөрөл нь энэ хувилбарын нөхцөл, дүн, хуваарьт хамаарна. Төлөх
        хуваарь нь төлбөр төлөгдсөн баримт биш.
      </p>
    </article>
  );
}
