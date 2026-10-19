"use client";
import { useState } from "react";
import type { WorkforceController } from "../useWorkforce";
import { FormDialog, Field, EmployeeSelect } from "../components/shared";
export interface ManualAttendanceSelection {
  userId?: string;
  day?: string;
}
export function ManualAttendanceDialog({
  controller,
  selection,
  onClose,
}: {
  controller: WorkforceController;
  selection: ManualAttendanceSelection;
  onClose: () => void;
}) {
  const [mode, setMode] = useState("in");
  const data = controller.data;
  if (!data) return null;
  const zones = data.zones.filter((zone) => zone.isActive);
  return (
    <FormDialog
      title="Гараар цаг бүртгэх"
      onClose={onClose}
      onSubmit={async (form) => {
        const day = String(form.get("day"));
        const nextDay = new Date(`${day}T00:00:00Z`);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        await controller.run("manual-attendance", "POST", {
          userId: form.get("userId"),
          zoneId: form.get("zoneId") || null,
          reason: form.get("reason"),
          clockIn:
            mode === "out" ? null : `${day}T${String(form.get("clockIn"))}:00`,
          clockOut:
            mode === "in"
              ? null
              : `${form.get("overnight") ? nextDay.toISOString().slice(0, 10) : day}T${String(form.get("clockOut"))}:00`,
        });
        controller.setToast("Гараар оруулсан цаг хадгалагдлаа");
      }}
    >
      <p>
        Байгууллагын цагийн бүс: <strong>{data.policy.timeZone}</strong>. Гараар
        нэмсэн бүртгэл өөрчлөлтийн түүхэд хадгалагдана.
      </p>
      <Field label="Бүртгэлийн төрөл">
        <select value={mode} onChange={(event) => setMode(event.target.value)}>
          <option value="in">Зөвхөн ирсэн — одоо ажиллаж байгаа</option>
          <option value="out">Зөвхөн явсан — нээлттэй бүртгэл хаах</option>
          <option value="both">Ирсэн ба явсан</option>
        </select>
      </Field>
      {mode === "out" && (
        <p className="wf-muted">
          Сонгосон ажилтны хаагдаагүй ирсэн бүртгэлд явсан цагийг нэмнэ. Өдрийг
          явсан өдрөөр сонгоно уу.
        </p>
      )}
      <Field label="Ажилтан">
        <EmployeeSelect
          employees={data.employees}
          defaultValue={selection.userId}
        />
      </Field>
      <div className="wf-form-grid">
        <Field label="Өдөр">
          <input
            name="day"
            type="date"
            required
            defaultValue={selection.day ?? data.today}
            max={data.today}
          />
        </Field>
        <Field label="Байршлын бүс (заавал биш)">
          <select name="zoneId" defaultValue="">
            <option value="">Байршилгүй</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="wf-form-grid">
        {mode !== "out" && (
          <Field label="Ирсэн цаг">
            <input name="clockIn" type="time" required defaultValue="09:00" />
          </Field>
        )}
        {mode !== "in" && (
          <Field label="Явсан цаг">
            <input name="clockOut" type="time" required defaultValue="18:00" />
          </Field>
        )}
      </div>
      {mode === "both" && (
        <label className="wf-checkbox">
          <input name="overnight" type="checkbox" />
          Явсан цаг дараагийн өдөрт хамаарна
        </label>
      )}
      <Field label="Гараар бүртгэх шалтгаан">
        <textarea
          name="reason"
          required
          maxLength={1000}
          placeholder="Яагаад гараар оруулж байгааг тайлбарлана уу"
        />
      </Field>
      <p className="wf-muted">
        GPS байршил баримтжуулагдаагүй гэж хадгална. Одоо байгаа бүртгэлтэй
        давхардвал хадгалахгүй.
      </p>
    </FormDialog>
  );
}
