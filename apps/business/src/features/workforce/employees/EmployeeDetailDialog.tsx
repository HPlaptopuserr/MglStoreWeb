"use client";
import { Pencil, ShieldCheck } from "lucide-react";
import { useId, useState } from "react";
import { EmployeeContactActions } from "./EmployeeContactActions";
import { EmployeeProfileTabs, type EmployeeTab } from "./EmployeeProfileTabs";
import type { WorkforceEmployee } from "@mgl/types";
import type { WorkforceController } from "../useWorkforce";
import { WorkforceDialog } from "../components/WorkforceDialog";
import { EmployeePayrollDetails } from "./EmployeePayrollDetails";
import { EmployeeIdentity } from "./EmployeeIdentity";
import { EmployeeWorkDetails } from "./EmployeeWorkDetails";
import {
  EmployeePrivateDetails,
  EmployeeEmergencyDetails,
} from "./EmployeeDetailSections";
import { useEmployeeDetails } from "./useEmployeeDetails";
import "./employees.css";
export function EmployeeDetailDialog({
  employee,
  controller,
  onClose,
  onEdit,
}: {
  employee: WorkforceEmployee;
  controller: WorkforceController;
  onClose: () => void;
  onEdit: (section?: "payroll") => void;
}) {
  const id = useId();
  const [tab, setTab] = useState<EmployeeTab>("work");
  const organization = controller.data?.organization;
  const canManage = controller.data?.session.canManage ?? false;
  const resource = useEmployeeDetails(employee.id, organization?.id, canManage);
  const profile = resource.data?.profile;
  const activeTab = canManage ? tab : "work";
  const email = profile?.email || employee.email;
  const phone = profile?.phone || employee.phone;
  return (
    <WorkforceDialog
      title="Ажилтны дэлгэрэнгүй"
      onClose={onClose}
      className="wf-employee-dialog wf-employee-detail-dialog"
      subtitle="Байгууллагын ажилтны бүртгэл"
      footer={
        <>
          <span className="wf-profile-footer-note">
            <ShieldCheck size={14} aria-hidden="true" /> Байгууллагын мэдээлэл
          </span>
          <button type="button" onClick={onClose}>
            Хаах
          </button>
          {canManage && (
            <button
              type="button"
              className="wf-primary"
              onClick={() =>
                onEdit(activeTab === "payroll" ? "payroll" : undefined)
              }
            >
              <Pencil size={15} /> Мэдээлэл засах
            </button>
          )}
        </>
      }
    >
      <EmployeeIdentity
        employee={employee}
        organizationName={organization?.name ?? ""}
        jobTitle={profile?.jobTitle || employee.jobTitle}
      />
      <EmployeeContactActions email={email} phone={phone} />
      <EmployeeProfileTabs
        active={activeTab}
        onChange={setTab}
        privateVisible={canManage}
        id={id}
      />
      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-${activeTab}`}
        tabIndex={0}
        className="wf-profile-panel"
      >
        {activeTab === "work" && (
          <EmployeeWorkDetails employee={employee} profile={profile} />
        )}
        {activeTab !== "work" && resource.loading && (
          <p role="status" className="wf-muted">
            Дэлгэрэнгүй мэдээлэл ачаалж байна…
          </p>
        )}
        {resource.error && (
          <div className="wf-error" role="alert">
            {resource.error}
            <button type="button" onClick={resource.retry}>
              Дахин ачаалах
            </button>
          </div>
        )}
        {profile && activeTab === "personal" && (
          <EmployeePrivateDetails profile={profile} />
        )}
        {profile && canManage && activeTab === "payroll" && (
          <EmployeePayrollDetails
            account={profile}
            onEdit={() => onEdit("payroll")}
          />
        )}
        {profile && activeTab === "emergency" && (
          <EmployeeEmergencyDetails profile={profile} />
        )}
      </div>
      <p className="wf-employee-detail-scope">
        <ShieldCheck size={16} aria-hidden="true" />
        Зөвхөн {organization?.name} байгууллагын бүртгэлийг харуулж байна.
      </p>
    </WorkforceDialog>
  );
}
