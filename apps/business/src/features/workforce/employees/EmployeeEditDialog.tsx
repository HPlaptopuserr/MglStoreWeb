"use client";
import { ShieldCheck } from "lucide-react";
import { payrollAccountError } from "@mgl/types";
import type { WorkforceEmployee } from "@mgl/types";
import type { WorkforceController } from "../hooks/useWorkforce";
import { useEmployeeDetails } from "./useEmployeeDetails";
import { Field, FormDialog } from "../components/shared";
import { DepartmentInput } from "./DepartmentInput";
import {
  EmployeeProfileFields,
  employeeProfileFromForm,
} from "./EmployeeProfileFields";
import "./employees.css";
export function EmployeeEditDialog({
  employee,
  focusPayroll = false,
  controller,
  onClose,
}: {
  employee: WorkforceEmployee;
  focusPayroll?: boolean;
  controller: WorkforceController;
  onClose: () => void;
}) {
  const { data, run, setToast } = controller;
  const organization = data?.organization;
  const resource = useEmployeeDetails(employee.id, organization?.id);
  const names = [
    ...new Set([
      ...(data?.departments.map((department) => department.name) ?? []),
      ...(data?.employees.map((member) => member.department).filter(Boolean) ??
        []),
    ]),
  ].sort((a, b) => a.localeCompare(b, "mn"));
  return (
    <FormDialog
      className="wf-employee-dialog wf-employee-edit-dialog"
      title={`${employee.name} · Мэдээлэл засах`}
      onClose={onClose}
      submitLabel="Мэдээлэл хадгалах"
      submitDisabled={!resource.data || resource.loading}
      onSubmit={async (form) => {
        if (!resource.data) return;
        const profile = employeeProfileFromForm(form, resource.data.profile);
        const error = payrollAccountError(profile);
        if (error) throw new Error(error);
        await run(`employees/${employee.id}`, "PATCH", {
          workforceDisplayName: form.get("workforceDisplayName"),
          department: form.get("department"),
          active: form.get("active") === "true",
          profile,
        });
        setToast("Ажилтны мэдээлэл зөвхөн энэ байгууллагад шинэчлэгдлээ");
      }}
    >
      <div className="wf-employee-scope">
        <ShieldCheck size={20} aria-hidden="true" />
        <div>
          <strong>{organization?.name}</strong>
          <p>
            Зөвхөн энэ байгууллагын бүртгэл шинэчлэгдэнэ. Үндсэн MGL бүртгэл
            болон бусад байгууллагын мэдээлэл өөрчлөгдөхгүй.
          </p>
        </div>
      </div>
      {resource.loading && (
        <p role="status" className="wf-muted">
          Ажилтны мэдээлэл ачаалж байна…
        </p>
      )}
      {resource.error && (
        <div role="alert" className="wf-error">
          {resource.error}
          <button type="button" onClick={resource.retry}>
            Дахин ачаалах
          </button>
        </div>
      )}
      {resource.data && (
        <div key={resource.revision} className="wf-employee-fields">
          <details className="wf-employee-account">
            <summary>Үндсэн MGL нэвтрэх бүртгэл</summary>
            <span>MGL нэвтрэх бүртгэл</span>
            <strong>
              {resource.data.account.email ||
                resource.data.account.phone ||
                "—"}
            </strong>
            <small>
              Нэвтрэх бүртгэл өөрчлөгдөхгүй. Доорх утас, имэйл нь байгууллагын
              холбоо барих мэдээлэл болно.
            </small>
          </details>
          {employee.employmentEndedAt && (
            <p className="wf-muted">
              Ажлаас гарсан: {employee.employmentEndedAt}
              <br />
              {employee.employmentEndReason}
            </p>
          )}
          <EmployeeProfileFields
            profile={resource.data.profile}
            focusPayroll={focusPayroll}
            today={data?.today ?? ""}
          />
          <section
            className="wf-employee-section"
            aria-label="Хэлтэс ба цаг бүртгэл"
          >
            <h3>Хэлтэс ба цаг бүртгэл</h3>
            <DepartmentInput names={names} defaultValue={employee.department} />
            <Field
              label="Цаг бүртгэлд харагдах нэр"
              hint="Хоосон бол дээрх нэрийг цаг бүртгэл, тайланд харуулна."
            >
              <input
                name="workforceDisplayName"
                defaultValue={employee.workforceDisplayName ?? ""}
                maxLength={150}
                placeholder="Ажилтны нэрийг ашиглах"
              />
            </Field>
            <Field label="Төлөв">
              <select name="active" defaultValue={String(employee.active)}>
                <option value="true">Идэвхтэй</option>
                <option value="false">Идэвхгүй</option>
              </select>
            </Field>
            <p className="wf-muted">
              Role болон нэмэлт эрхийг байгууллагын App Control-оос удирдана.
            </p>
          </section>
        </div>
      )}
    </FormDialog>
  );
}
