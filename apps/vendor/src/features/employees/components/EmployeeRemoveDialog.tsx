"use client";

import { employeeApi } from "../store-employee.api";
import type { StoreEmployee } from "../store-employee.model";
import { useEmployeeMutation } from "../useEmployeeMutation";
import { EmployeeDialog } from "./EmployeeDialog";
import { EmployeeAlert, EmployeeButton } from "./EmployeePrimitives";

export function EmployeeRemoveDialog({
  employee,
  onClose,
  onSuccess,
}: {
  employee: StoreEmployee;
  onClose: () => void;
  onSuccess: (employee: StoreEmployee) => void;
}) {
  const { saving, error, run } = useEmployeeMutation(onSuccess);
  return (
    <EmployeeDialog
      title="Ажилтнаас хасах уу?"
      description="Энэ дэлгүүрийн ажилтны бүртгэлээс хасаж, ажиллах эрхийг цуцална."
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
            variant="danger"
            busy={saving}
            onClick={() =>
              void run(async () => {
                await employeeApi.remove(employee.id);
                return employee;
              })
            }
          >
            Ажилтнаас хасах
          </EmployeeButton>
        </>
      }
    >
      <p className="break-words text-sm font-semibold text-slate-900">
        {employee.fullName || employee.email}
      </p>
      <p className="mt-1 break-all text-xs text-slate-500">{employee.email}</p>
      <p className="my-5 text-sm leading-6 text-slate-600">
        Хувийн MGL Store бүртгэл болон өмнөх борлуулалтын түүх хэвээр үлдэнэ.
        Дахин ажиллуулах бол ажилтнаар шинээр нэмнэ.
      </p>
      {error && <EmployeeAlert>{error}</EmployeeAlert>}
    </EmployeeDialog>
  );
}
