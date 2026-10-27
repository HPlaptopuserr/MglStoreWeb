import type { WorkforceEmployeeProfile } from "@mgl/types";
import {
  payrollAccountFields,
  normalizePayrollAccountNumber,
} from "@mgl/types";
import { PayrollAccountFields } from "./PayrollAccountFields";
import { Field } from "../components/shared";
type TextFieldKey = Exclude<keyof WorkforceEmployeeProfile, "gender" | "notes">;
interface ProfileField {
  key: TextFieldKey;
  label: string;
  maxLength?: number;
  type?: "text" | "email" | "tel" | "date";
  required?: boolean;
}
const personalFields: ProfileField[] = [
  { key: "lastName", label: "Овог", maxLength: 150 },
  { key: "fullName", label: "Нэр", maxLength: 150, required: true },
  { key: "registerNumber", label: "Регистрийн дугаар", maxLength: 20 },
  { key: "birthDate", label: "Төрсөн огноо", type: "date" },
  { key: "phone", label: "Холбоо барих утас", type: "tel", maxLength: 32 },
  { key: "email", label: "Холбоо барих имэйл", type: "email", maxLength: 254 },
];
const employmentFields: ProfileField[] = [
  { key: "employeeCode", label: "Ажилтны код", maxLength: 50 },
  { key: "jobTitle", label: "Албан тушаал", maxLength: 150 },
  { key: "hiredAt", label: "Ажилд орсон огноо", type: "date" },
];
const emergencyFields: ProfileField[] = [
  {
    key: "emergencyContactName",
    label: "Холбоо барих хүний нэр, хамаарал",
    maxLength: 150,
  },
  {
    key: "emergencyContactPhone",
    label: "Яаралтай холбоо барих утас",
    type: "tel",
    maxLength: 32,
  },
];
function ProfileInputs({
  fields,
  profile,
  today,
}: {
  fields: ProfileField[];
  profile: WorkforceEmployeeProfile;
  today: string;
}) {
  return (
    <>
      {fields.map((field) => (
        <Field key={field.key} label={field.label}>
          <input
            name={field.key}
            defaultValue={profile[field.key]}
            type={field.type ?? "text"}
            maxLength={field.maxLength}
            required={field.required}
            max={field.key === "birthDate" ? today : undefined}
            autoComplete="off"
          />
        </Field>
      ))}
    </>
  );
}
export function EmployeeProfileFields({
  profile,
  today,
  focusPayroll = false,
}: {
  profile: WorkforceEmployeeProfile;
  today: string;
  focusPayroll?: boolean;
}) {
  return (
    <>
      <section className="wf-employee-section" aria-label="Хувийн мэдээлэл">
        <h3>Хувийн болон холбоо барих мэдээлэл</h3>
        <div className="wf-form-grid">
          <ProfileInputs
            fields={personalFields}
            profile={profile}
            today={today}
          />
          <Field label="Хүйс">
            <select name="gender" defaultValue={profile.gender}>
              <option value="">Сонгоогүй</option>
              <option value="MALE">Эрэгтэй</option>
              <option value="FEMALE">Эмэгтэй</option>
              <option value="OTHER">Бусад</option>
            </select>
          </Field>
        </div>
        <Field label="Гэрийн хаяг">
          <textarea
            name="address"
            defaultValue={profile.address}
            rows={2}
            maxLength={1000}
          />
        </Field>
      </section>
      <section className="wf-employee-section" aria-label="Ажлын мэдээлэл">
        <h3>Ажлын мэдээлэл</h3>
        <div className="wf-form-grid">
          <ProfileInputs
            fields={employmentFields}
            profile={profile}
            today={today}
          />
        </div>
      </section>
      <PayrollAccountFields account={profile} focusOnMount={focusPayroll} />
      <section
        className="wf-employee-section"
        aria-label="Яаралтай холбоо барих"
      >
        <h3>Яаралтай холбоо барих</h3>
        <div className="wf-form-grid">
          <ProfileInputs
            fields={emergencyFields}
            profile={profile}
            today={today}
          />
        </div>
        <Field label="Нэмэлт мэдээлэл">
          <textarea
            name="notes"
            defaultValue={profile.notes}
            rows={3}
            maxLength={2000}
          />
        </Field>
      </section>
    </>
  );
}
export function employeeProfileFromForm(
  form: FormData,
  profile: WorkforceEmployeeProfile,
): WorkforceEmployeeProfile {
  const result = { ...profile };
  for (const { key } of [
    ...personalFields,
    ...employmentFields,
    ...emergencyFields,
  ])
    result[key] = String(form.get(key) ?? "");
  for (const key of payrollAccountFields)
    result[key] = String(form.get(key) ?? "");
  result.payrollAccountNumber = normalizePayrollAccountNumber(
    result.payrollAccountNumber,
  );
  result.address = String(form.get("address") ?? "");
  result.notes = String(form.get("notes") ?? "");
  const gender = form.get("gender");
  result.gender =
    gender === "MALE" || gender === "FEMALE" || gender === "OTHER"
      ? gender
      : "";
  return result;
}
