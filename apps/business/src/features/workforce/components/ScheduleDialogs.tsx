"use client";
import type { WorkforceAssignment } from "@mgl/types";
import type { WorkforceController } from "../hooks/useWorkforce";
import { EmployeeSelect, Field, FormDialog } from "./shared";
const weekdays = [
  "Ням",
  "Даваа",
  "Мягмар",
  "Лхагва",
  "Пүрэв",
  "Баасан",
  "Бямба",
];
function minute(value: FormDataEntryValue | null) {
  const [h, m] = String(value).split(":").map(Number);
  return h * 60 + m;
}
function clock(value: number) {
  return (
    String(Math.floor(value / 60)).padStart(2, "0") +
    ":" +
    String(value % 60).padStart(2, "0")
  );
}
export function ShiftTemplateDialog({
  controller,
  onClose,
}: {
  controller: WorkforceController;
  onClose: () => void;
}) {
  const { run, setToast } = controller;
  return (
    <FormDialog
      title="Ээлжийн загвар нэмэх"
      onClose={onClose}
      onSubmit={async (f) => {
        await run("shifts", "POST", {
          name: f.get("name"),
          startMinute: minute(f.get("start")),
          endMinute: minute(f.get("end")),
          breakMinutes: Number(f.get("break")),
          weekdays: f.getAll("weekdays").map(Number),
          color: f.get("color"),
        });
        setToast("Ээлж үүсгэлээ");
      }}
    >
      <Field label="Ээлжийн нэр">
        <input name="name" required maxLength={120} />
      </Field>
      <div className="wf-form-grid">
        <Field label="Эхлэх">
          <input type="time" name="start" defaultValue="09:00" required />
        </Field>
        <Field label="Дуусах">
          <input type="time" name="end" defaultValue="18:00" required />
        </Field>
      </div>
      <Field label="Завсарлага (минут)">
        <input
          name="break"
          type="number"
          defaultValue={60}
          min={0}
          max={720}
          required
        />
      </Field>
      <fieldset className="wf-checkboxes">
        <legend>Ажиллах гараг</legend>
        {weekdays.map((name, i) => (
          <label key={i}>
            <input
              type="checkbox"
              name="weekdays"
              value={i}
              defaultChecked={i > 0 && i < 6}
            />
            {name}
          </label>
        ))}
      </fieldset>
      <Field label="Өнгө">
        <input name="color" type="color" defaultValue="#5b8cff" />
      </Field>
    </FormDialog>
  );
}
export function AssignmentDialog({
  controller,
  copy,
  onClose,
}: {
  controller: WorkforceController;
  copy: WorkforceAssignment | null;
  onClose: () => void;
}) {
  const { data, run, setToast, range } = controller;
  if (!data) return null;
  return (
    <FormDialog
      title={copy ? "Хуваарь хуулж оноох" : "Хуваарь оноох"}
      onClose={onClose}
      onSubmit={async (f) => {
        await run("assignments", "POST", {
          userIds: f.getAll("userIds"),
          shiftId: f.get("shiftId"),
          from: f.get("from"),
          to: f.get("to"),
          zoneId: f.get("zoneId"),
        });
        setToast("Хуваарь оноогдлоо");
      }}
    >
      <Field label="Ажилтан сонгох" hint="Олон ажилтан сонгож болно.">
        <EmployeeSelect
          employees={data.employees}
          name="userIds"
          multiple
          defaultValue={copy ? [copy.userId] : undefined}
        />
      </Field>
      <Field label="Ээлж">
        <select name="shiftId" defaultValue={copy?.shiftId} required>
          <option value="">Ээлж сонгох</option>
          {data.shifts
            .filter((s) => s.active)
            .map((s) => (
              <option value={s.id} key={s.id}>
                {s.name} · {clock(s.startMinute)}–{clock(s.endMinute)}
              </option>
            ))}
        </select>
      </Field>
      <div className="wf-form-grid">
        <Field label="Эхлэх өдөр">
          <input name="from" type="date" required defaultValue={range.from} />
        </Field>
        <Field label="Дуусах өдөр">
          <input name="to" type="date" required defaultValue={range.to} />
        </Field>
      </div>
      <Field label="Бүртгэлийн бүс">
        <select name="zoneId" defaultValue={copy?.zoneId ?? ""}>
          <option value="">Бүс оноохгүй</option>
          {data.zones
            .filter((z) => z.isActive)
            .map((z) => (
              <option value={z.id} key={z.id}>
                {z.name}
              </option>
            ))}
        </select>
      </Field>
    </FormDialog>
  );
}
