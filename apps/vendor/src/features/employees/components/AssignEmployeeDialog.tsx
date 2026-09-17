"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, UserRoundPlus } from "lucide-react";
import { employeeApi } from "../store-employee.api";
import type { PersonalAccount, StoreEmployee } from "../store-employee.model";
import { useEmployeeMutation } from "../useEmployeeMutation";
import { EmployeeAssignmentReview } from "./EmployeeAssignmentReview";
import { EmployeeAssignmentSteps } from "./EmployeeAssignmentSteps";
import { EmployeeDialog } from "./EmployeeDialog";
import { EmployeeAlert, EmployeeButton } from "./EmployeePrimitives";
import { PersonalAccountSearch } from "./PersonalAccountSearch";

type AssignmentState =
  | { step: "select"; account: PersonalAccount | null }
  | { step: "review"; account: PersonalAccount };

interface AssignEmployeeDialogProps {
  organizationId: string;
  onClose: () => void;
  onSuccess: (employee: StoreEmployee) => void;
}

export function AssignEmployeeDialog({
  organizationId,
  onClose,
  onSuccess,
}: AssignEmployeeDialogProps) {
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<AssignmentState>({
    step: "select",
    account: null,
  });
  const { saving, error, run, clearError } = useEmployeeMutation(onSuccess);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const isSelecting = selection.step === "select";

  function review() {
    if (!selection.account) return;
    setSelection({ step: "review", account: selection.account });
    requestAnimationFrame(() => reviewHeading.current?.focus());
  }

  function back() {
    clearError();
    setSelection({ step: "select", account: selection.account });
  }

  function assign() {
    if (selection.step !== "review") return;
    return run(() => employeeApi.assign(organizationId, selection.account.id));
  }

  return (
    <EmployeeDialog
      title="Ажилтан нэмэх"
      description="MGL Store-ийн хувийн бүртгэлээс багтаа нэмнэ."
      busy={saving}
      onClose={onClose}
      footer={
        <>
          <EmployeeButton
            variant="secondary"
            disabled={saving}
            onClick={isSelecting ? onClose : back}
          >
            {!isSelecting && (
              <ArrowLeft className="size-4" aria-hidden="true" />
            )}
            {isSelecting ? "Болих" : "Буцах"}
          </EmployeeButton>
          {isSelecting ? (
            <EmployeeButton disabled={!selection.account} onClick={review}>
              Үргэлжлүүлэх
              <ArrowRight className="size-4" aria-hidden="true" />
            </EmployeeButton>
          ) : (
            <EmployeeButton busy={saving} onClick={() => void assign()}>
              {!saving && (
                <UserRoundPlus className="size-4" aria-hidden="true" />
              )}
              {saving ? "Эрх олгож байна…" : "Кассын эрх олгох"}
            </EmployeeButton>
          )}
        </>
      }
    >
      <EmployeeAssignmentSteps step={isSelecting ? 1 : 2} />
      {selection.step === "select" ? (
        <PersonalAccountSearch
          organizationId={organizationId}
          query={query}
          onQueryChange={(value) => {
            setQuery(value);
            setSelection({ step: "select", account: null });
          }}
          selected={selection.account}
          onSelect={(account) => setSelection({ step: "select", account })}
        />
      ) : (
        <EmployeeAssignmentReview
          account={selection.account}
          heading={reviewHeading}
        />
      )}
      {error && (
        <div className="mt-5">
          <EmployeeAlert>{error}</EmployeeAlert>
        </div>
      )}
    </EmployeeDialog>
  );
}
