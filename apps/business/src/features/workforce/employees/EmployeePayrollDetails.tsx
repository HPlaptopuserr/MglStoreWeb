"use client";
import { useState } from "react";
import { Eye, EyeOff, Landmark, Plus, ShieldCheck } from "lucide-react";
import type { WorkforcePayrollAccount } from "@mgl/types";
import { maskPayrollAccountNumber } from "@mgl/types";
export function EmployeePayrollDetails({
  account,
  onEdit,
}: {
  account: WorkforcePayrollAccount;
  onEdit: () => void;
}) {
  const [visible, setVisible] = useState(false);
  if (!account.payrollAccountNumber)
    return (
      <div className="wf-payroll-empty">
        <span>
          <Landmark size={26} aria-hidden="true" />
        </span>
        <h3>Цалингийн данс бүртгээгүй</h3>
        <p>
          Ажилтны цалин хүлээн авах банк, дансны дугаар болон данс эзэмшигчийг
          нэмнэ үү.
        </p>
        <button type="button" className="wf-primary" onClick={onEdit}>
          <Plus size={16} /> Цалингийн данс нэмэх
        </button>
      </div>
    );
  return (
    <div className="wf-payroll-details">
      <div className="wf-payroll-bank">
        <Landmark size={23} aria-hidden="true" />
        <div>
          <small>ЦАЛИН ХҮЛЭЭН АВАХ ДАНС</small>
          <strong>{account.payrollBankName}</strong>
        </div>
        <span>Бүртгэсэн</span>
      </div>
      <div className="wf-payroll-number">
        <span>Дансны дугаар / IBAN</span>
        <div>
          <strong>
            {visible
              ? account.payrollAccountNumber
              : maskPayrollAccountNumber(account.payrollAccountNumber)}
          </strong>
          <button
            type="button"
            aria-label={visible ? "Дансны дугаар нуух" : "Дансны дугаар харах"}
            aria-pressed={visible}
            onClick={() => setVisible((value) => !value)}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      <div className="wf-payroll-holder">
        <span>Данс эзэмшигч</span>
        <strong>{account.payrollAccountHolder}</strong>
      </div>
      <p className="wf-employee-detail-scope">
        <ShieldCheck size={15} aria-hidden="true" />
        Энэ байгууллагын цалингийн бүртгэлд ашиглана. Шилжүүлэг хийхийн өмнө
        дансны мэдээллийг шалгана уу.
      </p>
    </div>
  );
}
