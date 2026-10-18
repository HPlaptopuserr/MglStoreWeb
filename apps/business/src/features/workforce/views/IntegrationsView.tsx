"use client";
import { useState } from "react";
import { KeyRound, Plus } from "lucide-react";
import type { WorkforceController } from "../useWorkforce";
import { Empty, Field, FormDialog, Panel } from "../components/shared";
const scopes = [
  ["attendance:read", "Ирцийн мэдээлэл унших"],
  ["employees:read", "Ажилтны үндсэн мэдээлэл унших"],
  ["organization:read", "Байгууллагын мэдээлэл унших"],
  ["reports:read", "Цагийн тайлан унших"],
] as const;
export function IntegrationsView({
  controller,
}: {
  controller: WorkforceController;
}) {
  const { data, run, setToast } = controller;
  const [create, setCreate] = useState(false),
    [secret, setSecret] = useState(""),
    [revoke, setRevoke] = useState("");
  if (!data) return null;
  return (
    <>
      <div className="wf-toolbar">
        <p className="wf-muted">
          Гадаад системд байгууллагын мэдээллийг хязгаарлагдсан эрхээр уншуулна.
        </p>
        {data.session.canManage && (
          <button className="wf-primary" onClick={() => setCreate(true)}>
            <Plus size={16} /> Үүсгэх
          </button>
        )}
      </div>
      {secret && (
        <div className="wf-secret" role="status">
          <strong>
            Түлхүүрийг одоо хуулж хадгална уу. Дахин харах боломжгүй.
          </strong>
          <code>{secret}</code>
          <button
            onClick={() =>
              void navigator.clipboard
                .writeText(secret)
                .then(() => setToast("Түлхүүр хуулагдлаа"))
                .catch(() => setToast("Текстийг сонгож гараар хуулна уу"))
            }
          >
            Хуулах
          </button>
          <button onClick={() => setSecret("")}>Хаах</button>
        </div>
      )}
      <Panel title="API холболт" action={<KeyRound size={20} />}>
        <div className="wf-integration-help">
          <h3>Хэрхэн ажилладаг вэ?</h3>
          <ol>
            <li>Нэр, дуусах хугацаа болон унших мэдээллийн хүрээг сонгоно.</li>
            <li>Нууц түлхүүрийг нэг удаа хуулж авна.</li>
            <li>
              Гадаад системийн хүсэлтэд{" "}
              <code>Authorization: Bearer &lt;token&gt;</code> ашиглана.
            </li>
            <li>Шаардлагагүй түлхүүрийг цуцалж, шинэ түлхүүрээр солино.</li>
          </ol>
          <p>
            API зам: <code>/api/workforce/integration/organization</code>,{" "}
            <code>employees</code>, <code>attendance</code>,{" "}
            <code>reports</code>. Тайланд{" "}
            <code>?from=YYYY-MM-DD&amp;to=YYYY-MM-DD</code> өгнө.
          </p>
          {scopes.map(([key, label]) => (
            <p key={key}>
              <span className="wf-badge">{key}</span> {label}
            </p>
          ))}
        </div>
        {data.tokens.length ? (
          <div className="wf-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Нэр</th>
                  <th>Түлхүүр</th>
                  <th>Хамрах хүрээ</th>
                  <th>Дуусах</th>
                  <th>Сүүлд ашигласан</th>
                  <th>Төлөв</th>
                  <th>Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {data.tokens.map((t) => (
                  <tr key={t.id}>
                    <td>{t.name}</td>
                    <td>
                      <code>{t.prefix}…</code>
                    </td>
                    <td>{t.scopes.join(", ")}</td>
                    <td>{t.expiresAt.slice(0, 10)}</td>
                    <td>{t.lastUsedAt?.slice(0, 16) ?? "—"}</td>
                    <td>
                      {t.revokedAt
                        ? "Цуцалсан"
                        : +new Date(t.expiresAt) < Date.now()
                          ? "Дууссан"
                          : "Идэвхтэй"}
                    </td>
                    <td>
                      {!t.revokedAt && data.session.canManage && (
                        <button onClick={() => setRevoke(t.id)}>Цуцлах</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="API түлхүүр үүсгээгүй" />
        )}
      </Panel>
      {create && (
        <FormDialog
          title="API түлхүүр үүсгэх"
          onClose={() => setCreate(false)}
          onSubmit={async (f) => {
            const result = await run<{ secret: string }>("tokens", "POST", {
              name: f.get("name"),
              expiresAt: f.get("expiresAt"),
              scopes: f.getAll("scopes"),
            });
            setSecret(result.secret);
          }}
        >
          <Field label="Түлхүүрийн нэр">
            <input name="name" required maxLength={100} />
          </Field>
          <Field label="Дуусах хугацаа">
            <input name="expiresAt" type="datetime-local" required />
          </Field>
          <fieldset className="wf-checkboxes">
            <legend>Хамрах хүрээ</legend>
            {scopes.map(([key, label]) => (
              <label key={key}>
                <input name="scopes" type="checkbox" value={key} />
                {label}
              </label>
            ))}
          </fieldset>
        </FormDialog>
      )}
      {revoke && (
        <FormDialog
          title="Түлхүүр цуцлах"
          submitLabel="Цуцлах"
          onClose={() => setRevoke("")}
          onSubmit={async () => {
            await run(`tokens/${revoke}`, "DELETE");
            setToast("Түлхүүр цуцлагдлаа");
          }}
        >
          <p>
            Энэ түлхүүрээр илгээсэн дараагийн API хүсэлтүүдэд хандах эрхгүй
            болно.
          </p>
        </FormDialog>
      )}
    </>
  );
}
