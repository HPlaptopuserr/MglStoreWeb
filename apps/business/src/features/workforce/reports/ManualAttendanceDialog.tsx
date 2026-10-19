"use client";
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
  const data = controller.data;
  if (!data) return null;
  const zones = data.zones.filter((zone) => zone.isActive);
  return (
    <FormDialog
      title="Гараар цаг бүртгэх"
      onClose={onClose}
      submitDisabled={!zones.length}
      onSubmit={async (form) => {
        const day = String(form.get("day"));
        const nextDay = new Date(`${day}T00:00:00Z`);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        await controller.run("manual-attendance", "POST", {
          userId: form.get("userId"),
          zoneId: form.get("zoneId"),
          reason: form.get("reason"),
          clockIn: `${day}T${String(form.get("clockIn"))}:00`,
          clockOut: `${form.get("overnight") ? nextDay.toISOString().slice(0, 10) : day}T${String(form.get("clockOut"))}:00`,
        });
        controller.setToast("Гараар оруулсан цаг хадгалагдлаа");
      }}
    >
      <p>
        Байгууллагын цагийн бүс: <strong>{data.policy.timeZone}</strong>. Гараар
        нэмсэн бүртгэл өөрчлөлтийн түүхэд хадгалагдана.
      </p>
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
        <Field label="Байршлын бүс">
          <select name="zoneId" required defaultValue="">
            <option value="" disabled>
              Бүс сонгох
            </option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {!zones.length && (
        <p className="wf-error" role="alert">
          Эхлээд Байршил хэсэгт идэвхтэй бүс нэмнэ үү.
        </p>
      )}
      <div className="wf-form-grid">
        <Field label="Ирсэн цаг">
          <input name="clockIn" type="time" required defaultValue="09:00" />
        </Field>
        <Field label="Явсан цаг">
          <input name="clockOut" type="time" required defaultValue="18:00" />
        </Field>
      </div>
      <label className="wf-checkbox">
        <input name="overnight" type="checkbox" />
        Явсан цаг дараагийн өдөрт хамаарна
      </label>
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
