"use client";

import { employeeApi } from "../store-employee.api";
import type { StoreEmployee } from "../store-employee.model";
import { useEmployeeMutation } from "../useEmployeeMutation";
import { EmployeeDialog } from "./EmployeeDialog";
import { EmployeeAlert, EmployeeButton } from "./EmployeePrimitives";

export function EmployeeCashierDialog({
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
  return (
    <EmployeeDialog
      title="Кассын эрх олгох"
      description={`${employee.fullName || employee.email} · ${employee.email}`}
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
            busy={saving}
            onClick={() =>
              void run(() =>
                employeeApi.grantCashier(organizationId, employee.id),
              )
            }
          >
            Кассын эрх олгох
          </EmployeeButton>
        </>
      }
    >
      <div className="space-y-3 text-sm leading-6 text-slate-600">
        <p>
          Энэ дэлгүүрт POS касс ажиллуулах, ээлж нээж хаах, барааны үлдэгдэл
          харах эрх олгоно.
        </p>
        <p>
          Ажилтан өөрийн MGL Store бүртгэлээр нэвтэрч, энэ дэлгүүрийг сонгоно.
          Эрх олгосны дараа нээлттэй хуудсаа шинэчилнэ.
        </p>
        <p className="rounded-xl bg-blue-50 p-3 text-blue-800">
          Хувийн нууц үг, бусад дэлгүүрийн эрх болон өмнө оноосон эрхүүд хэвээр
          үлдэнэ.
        </p>
      </div>
      {error && <EmployeeAlert>{error}</EmployeeAlert>}
    </EmployeeDialog>
  );
}
