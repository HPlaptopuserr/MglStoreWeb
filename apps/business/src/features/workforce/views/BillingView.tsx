"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Mail, MapPinned, Plus, RefreshCw } from "lucide-react";
import type { WorkforceController } from "../useWorkforce";
import type { WorkforceSection } from "../navigation";
import {
  Empty,
  Field,
  FormDialog,
  Panel,
  Stats,
  money,
} from "../components/shared";
interface BillingData {
  catalog: {
    code: string;
    name: string;
    description: string;
    price: number | null;
  }[];
  orders: {
    id: string;
    kind: string;
    addonCode: string | null;
    seats: number;
    amount: number;
    state: string;
    createdAt: string;
    paidAt: string | null;
  }[];
  paymentConfigured: boolean;
}
interface Invoice {
  orderId: string;
  amount: number;
  invoice: {
    qr_text?: string;
    qr_image?: string;
    urls?: { name: string; description: string; link: string }[];
  };
}
export function BillingView({
  controller,
  section,
}: {
  controller: WorkforceController;
  section?: WorkforceSection;
}) {
  const { data, run, setToast } = controller;
  const [billing, setBilling] = useState<BillingData | null>(null),
    [error, setError] = useState(""),
    [order, setOrder] = useState<string | null>(null),
    [invoice, setInvoice] = useState<Invoice | null>(null),
    [seats, setSeats] = useState(1),
    [checking, setChecking] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!data) return;
    const controller = new AbortController();
    void fetch(
      `/api/workforce/billing?organizationId=${data.organization.id}`,
      { signal: controller.signal },
    )
      .then(async (r) => {
        const b = (await r.json()) as BillingData & { message?: string };
        if (!r.ok) throw new Error(b.message ?? "Мэдээлэл ачаалж чадсангүй");
        setBilling(b);
        setError("");
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Алдаа");
      });
    return () => controller.abort();
  }, [data?.organization.id, revision]);
  if (!data) return null;
  const days = data.subscription.expiresAt
    ? Math.max(
        0,
        Math.ceil(
          (+new Date(data.subscription.expiresAt) - Date.now()) / 86400000,
        ),
      )
    : 0;
  const amount =
    data.subscription.seatUnitPrice && days
      ? Math.ceil((seats * data.subscription.seatUnitPrice * days) / 30)
      : null;
  async function check(id: string) {
    if (checking) return;
    setChecking(true);
    try {
      const result = await run<{ paid: boolean }>(`billing/${id}/check`);
      setToast(
        result.paid
          ? "Төлбөр баталгаажлаа. Эрх шинэчлэгдлээ."
          : "Төлбөр хараахан баталгаажаагүй байна",
      );
      setRevision((v) => v + 1);
      if (result.paid) setInvoice(null);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Шалгах үед алдаа гарлаа");
    } finally {
      setChecking(false);
    }
  }
  return (
    <>
      {error && (
        <div className="wf-error" role="alert">
          {error}
          <button onClick={() => setRevision((v) => v + 1)}>
            Дахин оролдох
          </button>
        </div>
      )}
      {section !== "market" && (
        <>
          <div className="wf-billing-hero">
            <p className="wf-kicker">ТАНЫ БАЙГУУЛЛАГЫН ҮЙЛЧИЛГЭЭ</p>
            <h2>{data.subscription.planName}</h2>
            <p>
              Гэрээ дуусах:{" "}
              {data.subscription.expiresAt?.slice(0, 10) ?? "Тохируулаагүй"} ·
              Валют: {data.subscription.currency}
            </p>
            <button
              className="wf-primary"
              onClick={() => {
                setSeats(1);
                setOrder("SEATS");
              }}
              disabled={!data.session.canManage}
            >
              <Plus size={17} /> Ажилтны эрх нэмэх
            </button>
          </div>
          <Stats
            items={[
              {
                label: "Ашигласан эрх",
                value: data.organization.activeMembers,
              },
              { label: "Нийт эрх", value: data.organization.maxMembers },
              {
                label: "Үлдсэн эрх",
                value: Math.max(
                  0,
                  data.organization.maxMembers -
                    data.organization.activeMembers,
                ),
                tone: "green",
              },
              {
                label: "Гэрээний үлдсэн хоног",
                value: days || "—",
                tone: "amber",
              },
            ]}
          />
        </>
      )}
      <Panel title="Нэмэлт үйлчилгээ · Маркет">
        <div className="wf-market-grid wf-panel-note">
          {billing?.catalog.map((item) => {
            const enabled = data.subscription.addons.includes(item.code);
            const Icon = item.code === "tracking" ? MapPinned : Mail;
            return (
              <article className="wf-market-card" key={item.code}>
                <div className="wf-market-art">
                  <Icon size={52} />
                  <span>{item.code === "tracking" ? "Tracking" : "Mail"}</span>
                </div>
                <h2>{item.name}</h2>
                <p>{item.description}</p>
                <strong>
                  {item.price === null
                    ? "Үнэ тохируулаагүй"
                    : money(item.price)}
                </strong>
                {enabled && (
                  <Link
                    className="wf-button"
                    href={`/attendance/${item.code === "tracking" ? "tracking" : "mail"}?organizationId=${data.organization.id}`}
                  >
                    Үйлчилгээ нээх →
                  </Link>
                )}
                <button
                  disabled={
                    !data.session.canManage ||
                    enabled ||
                    item.price === null ||
                    !billing.paymentConfigured
                  }
                  onClick={() => setOrder(item.code)}
                >
                  {enabled ? "Идэвхтэй" : "Үйлчилгээ авах"}
                </button>
              </article>
            );
          })}
          {!billing && !error && <p>Мэдээлэл ачаалж байна…</p>}
        </div>
        {billing && !billing.paymentConfigured && (
          <p className="wf-panel-note wf-muted">
            Төлбөрийн үйлчилгээ сервер дээр тохируулагдаагүй байна. Үнэ, багц,
            нэмэлт үйлчилгээг платформын App Control дээр удирдана.
          </p>
        )}
      </Panel>
      <Panel title="Төлбөрийн түүх">
        {billing?.orders.length ? (
          <div className="wf-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Огноо</th>
                  <th>Үйлчилгээ</th>
                  <th>Дүн</th>
                  <th>Төлөв</th>
                  <th>Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {billing.orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.createdAt.slice(0, 10)}</td>
                    <td>
                      {o.kind === "SEATS"
                        ? `${o.seats} ажилтны эрх`
                        : o.addonCode}
                    </td>
                    <td>{money(o.amount)}</td>
                    <td>
                      {o.state === "PAID"
                        ? "Төлөгдсөн"
                        : o.state === "FAILED"
                          ? "Амжилтгүй"
                          : o.state === "CREATING"
                            ? "Үүсгэж байна"
                            : "Хүлээгдэж буй"}
                    </td>
                    <td>
                      {o.state === "PENDING" && (
                        <button
                          disabled={checking}
                          onClick={() => void check(o.id)}
                        >
                          <RefreshCw size={14} /> Шалгах
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Төлбөрийн түүх алга" />
        )}
      </Panel>
      {order && (
        <FormDialog
          title={
            order === "SEATS" ? "Ажилтны тоо нэмэх" : "Нэмэлт үйлчилгээ авах"
          }
          submitLabel="Нэхэмжлэх үүсгэх"
          submitDisabled={
            !billing?.paymentConfigured || (order === "SEATS" && !amount)
          }
          onClose={() => setOrder(null)}
          onSubmit={async () => {
            const result = await run<Invoice>("billing", "POST", {
              kind: order === "SEATS" ? "SEATS" : "ADDON",
              seats,
              addonCode: order === "SEATS" ? undefined : order,
              idempotencyKey: crypto.randomUUID(),
            });
            setInvoice(result);
            setRevision((v) => v + 1);
          }}
        >
          {order === "SEATS" ? (
            <>
              <p>
                Гэрээ дуусах хүртэлх {days} хоногийн үнийг хувь тэнцүүлж тооцно.
              </p>
              <Field label="Нэмэх ажилтны тоо">
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={seats}
                  onChange={(e) => setSeats(Number(e.target.value))}
                  required
                />
              </Field>
              <p>
                Нэг ажилтны сарын үнэ:{" "}
                {data.subscription.seatUnitPrice
                  ? money(data.subscription.seatUnitPrice)
                  : "Тохируулаагүй"}
              </p>
              <h3>Нийт үнэ: {amount ? money(amount) : "Тооцох боломжгүй"}</h3>
            </>
          ) : (
            <>
              <h3>{billing?.catalog.find((a) => a.code === order)?.name}</h3>
              <p>
                Үйлчилгээний үнэ:{" "}
                {money(
                  billing?.catalog.find((a) => a.code === order)?.price ?? 0,
                )}
              </p>
            </>
          )}
          <p className="wf-muted">
            Төлбөр серверээр баталгаажсаны дараа үйлчилгээний эрх нэмэгдэнэ.
          </p>
        </FormDialog>
      )}
      {invoice && (
        <FormDialog
          title="Төлбөр төлөх"
          submitLabel={checking ? "Шалгаж байна…" : "Төлбөр шалгах"}
          onClose={() => setInvoice(null)}
          onSubmit={async () => {
            const result = await run<{ paid: boolean }>(
              `billing/${invoice.orderId}/check`,
            );
            if (!result.paid)
              throw new Error("Төлбөр хараахан баталгаажаагүй байна");
            setToast("Төлбөр баталгаажлаа");
            setRevision((v) => v + 1);
          }}
        >
          <h3>Төлөх дүн: {money(invoice.amount)}</h3>
          {invoice.invoice.qr_image && (
            <img
              className="wf-qr-image"
              src={`data:image/png;base64,${invoice.invoice.qr_image}`}
              alt="QPay төлбөрийн QR"
              width={240}
              height={240}
            />
          )}
          <div className="wf-actions">
            {invoice.invoice.urls
              ?.filter((url) =>
                /^(https?:|[a-z][a-z0-9+.-]*:\/\/)/i.test(url.link),
              )
              .map((url) => (
                <a
                  className="wf-button"
                  href={url.link}
                  key={url.name}
                  rel="noopener noreferrer"
                >
                  {url.description || url.name}
                </a>
              ))}
          </div>
        </FormDialog>
      )}
    </>
  );
}
