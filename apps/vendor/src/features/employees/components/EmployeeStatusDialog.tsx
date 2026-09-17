"use client";

import { PauseCircle, PlayCircle } from "lucide-react";
import { employeeApi } from "../store-employee.api";
import { useEmployeeMutation } from "../useEmployeeMutation";
import type { StoreEmployee } from "../store-employee.model";
import { EmployeeDialog } from "./EmployeeDialog";
import {
  EmployeeAlert,
  EmployeeAvatar,
  EmployeeButton,
} from "./EmployeePrimitives";

export function EmployeeStatusDialog({
  employee,
  organizationId,
  onClose,
  onSuccess,
}: {
  employee: StoreEmployee;
  organizationId: string;
  onClose: () => void;
  onSuccess: (employee: StoreEmployee) => void;
}) {
  const { saving, error, run } = useEmployeeMutation(onSuccess);
  const nextActive = !employee.isActive;

  function save() {
    return run(() =>
      employeeApi.setStatus(organizationId, employee.id, nextActive),
    );
  }

  return (
    <EmployeeDialog
      title={
        nextActive
          ? "Ажилтны эрхийг сэргээх үү?"
          : "Ажилтны эрхийг түр хаах уу?"
      }
      description="Зөвхөн энэ дэлгүүрийн ажлын эрхэд үйлчилнэ."
      busy={saving}
      onClose={onClose}
      footer={
        <>
          <EmployeeButton
            variant="secondary"
            disabled={saving}
            onClick={onClose}
          >
            Болих
          </EmployeeButton>
          <EmployeeButton
            variant={nextActive ? "primary" : "danger"}
            busy={saving}
            onClick={() => void save()}
          >
            {nextActive ? "Эрх сэргээх" : "Эрх түр хаах"}
          </EmployeeButton>
        </>
      }
    >
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
        <EmployeeAvatar name={employee.fullName || employee.email} />
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold">
            {employee.fullName || employee.email}
          </p>
          <p className="mt-1 break-all text-xs text-slate-500">
            {employee.email}
          </p>
        </div>
      </div>
      <div className="my-5 flex items-start gap-3 text-sm leading-6 text-slate-600">
        {nextActive ? (
          <PlayCircle
            className="mt-1 size-5 shrink-0 text-blue-600"
            aria-hidden="true"
          />
        ) : (
          <PauseCircle
            className="mt-1 size-5 shrink-0 text-amber-600"
            aria-hidden="true"
          />
        )}
        <p>
          {nextActive
            ? "Өмнө оноосон эрхээрээ энэ дэлгүүрт дахин ажиллах боломжтой болно."
            : "Энэ дэлгүүрт ажиллах эрх нь хаагдана. Хувийн MGL Store бүртгэл нь хэвээр үлдэх бөгөөд ажлын эрхийг хүссэн үедээ сэргээж болно."}
        </p>
      </div>
      {error && <EmployeeAlert>{error}</EmployeeAlert>}
    </EmployeeDialog>
  );
}
