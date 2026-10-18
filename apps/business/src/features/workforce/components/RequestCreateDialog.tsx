"use client";
import { useState } from "react";
import { workforceRequestLabels, type TimeRequestKind } from "@mgl/types";
import type { WorkforceController } from "../useWorkforce";
import { EmployeeSelect, Field, FormDialog, stamp } from "./shared";
export function RequestCreateDialog({
  controller,
  onClose,
}: {
  controller: WorkforceController;
  onClose: () => void;
}) {
  const { data, run, setToast } = controller;
  const [kind, setKind] = useState<TimeRequestKind>("LEAVE");
  if (!data) return null;
  return (
    <FormDialog
      title="Цагийн хүсэлт бүртгэх"
      onClose={onClose}
      onSubmit={async (f) => {
        await run("requests", "POST", {
          userId: f.get("userId"),
          kind: f.get("kind"),
          from: f.get("from"),
          to: f.get("to"),
          note: f.get("note"),
          direction: f.get("direction"),
          zoneId: f.get("zoneId"),
          recordId: f.get("recordId"),
        });
        setToast("Хүсэлт бүртгэгдлээ");
      }}
    >
      <Field label="Ажилтан">
        <EmployeeSelect employees={data.employees} />
      </Field>
      <Field label="Хүсэлтийн төрөл">
        <select
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as TimeRequestKind)}
        >
          {data.policy.requestKinds.map((k) => (
            <option key={k} value={k}>
              {workforceRequestLabels[k]}
            </option>
          ))}
        </select>
      </Field>
      <div className="wf-form-grid">
        <Field label="Эхлэх цаг">
          <input
            type="datetime-local"
            name="from"
            required
            defaultValue={`${data.today}T09:00`}
          />
        </Field>
        <Field label="Дуусах цаг">
          <input
            type="datetime-local"
            name="to"
            required
            defaultValue={`${data.today}T18:00`}
          />
        </Field>
      </div>
      {["REMOTE", "CORRECTION"].includes(kind) && (
        <>
          <Field label="Бүртгэх чиглэл">
            <select name="direction">
              <option value="IN">Ирэх</option>
              <option value="OUT">Явах</option>
            </select>
          </Field>
          <Field label="Бүртгэлийн бүс">
            <select name="zoneId">
              <option value="">Бүс сонгох</option>
              {data.zones
                .filter((z) => z.isActive)
                .map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field
            label="Засах бүртгэл"
            hint="Бүртгэл засах үед ажилтан болон огноотой нь тохируулж сонгоно."
          >
            <select name="recordId">
              <option value="">Шинэ эсвэл нээлттэй бүртгэл</option>
              {data.records.map((r) => (
                <option key={r.id} value={r.id}>
                  {data.employees.find((e) => e.userId === r.userId)?.name} ·{" "}
                  {stamp(r.clockIn, data.policy.timeZone)}
                </option>
              ))}
            </select>
          </Field>
        </>
      )}
      <Field label="Шалтгаан">
        <textarea name="note" required maxLength={2000} />
      </Field>
    </FormDialog>
  );
}
