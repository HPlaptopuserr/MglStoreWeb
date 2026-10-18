"use client";
import { useEffect, useState } from "react";
import { Mail, MapPin, Plus } from "lucide-react";
import type { WorkforceSection } from "../navigation";
import type { WorkforceController } from "../useWorkforce";
import {
  Empty,
  Loading,
  EmployeeSelect,
  Field,
  FormDialog,
  Panel,
  time,
} from "../components/shared";
const deliveryLabels: Record<string, string> = {
  PENDING: "Хүлээгдэж буй",
  SENDING: "Илгээж байна",
  SENT: "Илгээсэн",
  FAILED: "Амжилтгүй",
  UNCERTAIN: "Шалгах шаардлагатай",
};
interface TrackingData {
  points: {
    id: string;
    userId: string;
    lat: number;
    lng: number;
    accuracy: number;
    capturedAt: string;
  }[];
  preferences: { userId: string; updatedAt: string }[];
  retentionDays: number;
}
interface MailData {
  configured: boolean;
  campaigns: {
    id: string;
    title: string;
    content: string;
    createdAt: string;
    deliveries: {
      state: string;
      email: string;
      sentAt: string | null;
      lastError: string | null;
    }[];
  }[];
}
export function AddonViews({
  controller,
  section,
}: {
  controller: WorkforceController;
  section?: WorkforceSection;
}) {
  const { data, run, setToast } = controller;
  const [tracking, setTracking] = useState<TrackingData | null>(null),
    [mail, setMail] = useState<MailData | null>(null),
    [error, setError] = useState(""),
    [create, setCreate] = useState(false),
    [userId, setUserId] = useState(""),
    [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(true);
  const isTracking = section === "tracking";
  useEffect(() => {
    if (!data) return;
    const abort = new AbortController();
    setError("");
    setLoading(true);
    if (isTracking) setTracking(null);
    else setMail(null);
    void fetch(
      `/api/workforce/${isTracking ? "tracking" : "mail"}?organizationId=${data.organization.id}`,
      { signal: abort.signal },
    )
      .then(async (response) => {
        const payload = (await response.json()) as TrackingData &
          MailData & { message?: string };
        if (!response.ok)
          throw new Error(payload.message ?? "Мэдээлэл ачаалж чадсангүй");
        if (abort.signal.aborted) return;
        if (isTracking) setTracking(payload);
        else setMail(payload);
      })
      .catch((e) => {
        if (!abort.signal.aborted)
          setError(e instanceof Error ? e.message : "Холболтын алдаа");
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [data, isTracking, revision]);
  if (!data) return null;
  if (loading) return <Loading />;
  if (error)
    return (
      <div role="alert" className="wf-error">
        {error}
        <button onClick={() => setRevision((v) => v + 1)}>Дахин оролдох</button>
      </div>
    );
  const points =
      tracking?.points.filter((p) => !userId || p.userId === userId) ?? [],
    point = points[0];
  return (
    <>
      {isTracking ? (
        <>
          <div className="wf-toolbar">
            <p className="wf-muted">
              Ажилтан зөвшөөрч илгээсэн байршлууд. Сүүлийн 7 хоног · Хадгалах
              хугацаа 30 хоног.
            </p>
            <select
              aria-label="Байршлыг ажилтнаар шүүх"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="">Бүх ажилтан</option>
              {data.employees
                .filter((e) => e.active)
                .map((e) => (
                  <option key={e.userId} value={e.userId}>
                    {e.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="wf-two-columns">
            <Panel title="Илгээсэн байршлын түүх" action={<MapPin size={18} />}>
              <div className="wf-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Ажилтан</th>
                      <th>Бүртгэсэн</th>
                      <th>Байршил</th>
                      <th>Нарийвчлал</th>
                    </tr>
                  </thead>
                  <tbody>
                    {points.map((p) => (
                      <tr key={p.id}>
                        <td>
                          {data.employees.find((e) => e.userId === p.userId)
                            ?.name ?? "Ажилтан"}
                        </td>
                        <td>
                          {p.capturedAt.slice(0, 10)}{" "}
                          {time(p.capturedAt, data.policy.timeZone)}
                        </td>
                        <td>
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=16/${p.lat}/${p.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {p.lat.toFixed(5)}, {p.lng.toFixed(5)} ↗
                          </a>
                        </td>
                        <td>{Math.round(p.accuracy)}м</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!points.length && (
                <Empty
                  title="Илгээсэн байршил алга"
                  description="Ажилтан апп дотор зөвшөөрлөө идэвхжүүлж, байршлаа илгээнэ."
                />
              )}
            </Panel>
            <Panel title="Сүүлийн байршил">
              {point ? (
                <iframe
                  className="wf-tracking-map"
                  title="Ажилтны сүүлийн байршил"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${point.lng - 0.01}%2C${point.lat - 0.01}%2C${point.lng + 0.01}%2C${point.lat + 0.01}&marker=${point.lat}%2C${point.lng}&layer=mapnik`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Empty title="Байршил сонгоно уу" />
              )}
            </Panel>
          </div>
        </>
      ) : (
        <>
          <div className="wf-toolbar">
            <p className="wf-muted">
              Бодит имэйлтэй ажилтнуудад илгээнэ. Өдрийн лимит: 1000. Нэг удаад:
              200.
            </p>
            <button
              className="wf-primary"
              disabled={!data.session.canManage || !mail?.configured}
              onClick={() => setCreate(true)}
            >
              <Plus size={16} /> Имэйл бэлдэх
            </button>
          </div>
          {mail && !mail.configured && (
            <p className="wf-error">Имэйл сервер тохируулагдаагүй байна.</p>
          )}
          <Panel title="Имэйл илгээлтийн түүх" action={<Mail size={18} />}>
            <div className="wf-item-list">
              {mail?.campaigns.map((c) => (
                <details className="wf-mail-campaign" key={c.id}>
                  <summary>
                    <strong>{c.title}</strong>
                    <span>
                      {c.createdAt.slice(0, 10)} ·{" "}
                      {c.deliveries.filter((d) => d.state === "SENT").length} /{" "}
                      {c.deliveries.length} илгээсэн
                    </span>
                  </summary>
                  <p className="wf-prewrap">{c.content}</p>
                  <div className="wf-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Имэйл</th>
                          <th>Төлөв</th>
                          <th>Алдаа</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.deliveries.map((d) => (
                          <tr key={d.email}>
                            <td>{d.email}</td>
                            <td>{deliveryLabels[d.state] ?? d.state}</td>
                            <td>{d.lastError ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              ))}
            </div>
            {!mail?.campaigns.length && <Empty title="Имэйл илгээгээгүй" />}
          </Panel>
          {create && (
            <FormDialog
              title="Имэйл бэлдэж илгээх"
              submitLabel="Илгээх дараалалд оруулах"
              onClose={() => setCreate(false)}
              onSubmit={async (f) => {
                await run("mail", "POST", {
                  title: f.get("title"),
                  content: f.get("content"),
                  userIds: f.getAll("userIds"),
                  idempotencyKey: crypto.randomUUID(),
                });
                setToast("Имэйл илгээх дараалалд орлоо");
                setRevision((v) => v + 1);
              }}
            >
              <Field label="Хүлээн авагч">
                <EmployeeSelect
                  employees={data.employees}
                  name="userIds"
                  multiple
                />
              </Field>
              <Field label="Гарчиг">
                <input name="title" maxLength={200} required />
              </Field>
              <Field label="Агуулга">
                <textarea name="content" rows={7} maxLength={10000} required />
              </Field>
              <p className="wf-muted">
                Илгээсэн имэйлийг буцаах боломжгүй тул хүлээн авагч болон
                агуулгаа шалгана уу.
              </p>
            </FormDialog>
          )}
        </>
      )}
    </>
  );
}
