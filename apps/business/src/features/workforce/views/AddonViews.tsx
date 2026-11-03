"use client";
import { useState } from "react";
import { useWorkforceResource } from "../hooks/useWorkforceResource";
import { Mail, MapPin, Plus } from "lucide-react";
import type { WorkforceSection } from "../model/navigation";
import type { WorkforceController } from "../hooks/useWorkforce";
import {
  Empty,
  Loading,
  EmployeeSelect,
  Field,
  FormDialog,
  Panel,
  time,
} from "../components/shared";
import type { TrackingData, MailData } from "../model/addon";

const deliveryLabels: Record<string, string> = {
  PENDING: "Хүлээгдэж буй",
  SENDING: "Илгээж байна",
  SENT: "Илгээсэн",
  FAILED: "Амжилтгүй",
  UNCERTAIN: "Шалгах шаардлагатай",
};
export function AddonViews({
  controller,
  section,
}: {
  controller: WorkforceController;
  section?: WorkforceSection;
}) {
  const { data, run, setToast } = controller;
  const [create, setCreate] = useState(false),
    [userId, setUserId] = useState(""),
    [revision, setRevision] = useState(0);
  const isTracking = section === "tracking";
  const query = new URLSearchParams({
    organizationId: data?.organization.id ?? "",
  });
  const trackingResource = useWorkforceResource<TrackingData>(
    data && isTracking ? `tracking?${query}` : null,
    data,
    revision,
  );
  const mailResource = useWorkforceResource<MailData>(
    data && !isTracking ? `mail?${query}` : null,
    data,
    revision,
  );
  const { data: tracking } = trackingResource;
  const { data: mail } = mailResource;
  const { loading, error } = isTracking ? trackingResource : mailResource;
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
