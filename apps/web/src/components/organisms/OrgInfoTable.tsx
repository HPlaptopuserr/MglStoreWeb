"use client";

import React from "react";

export interface OrgContactInfo {
  orgName: string;
  orgRegister: string;
  orgAddress: string;
  orgPhone: string;
  orgEmail: string;
  orgWebsite: string;
}

export const DEFAULT_ORG_CONTACT: OrgContactInfo = {
  orgName: "ЭМ ЖИ ЭЛ БМБЧ ПЬЮР",
  orgRegister: "",
  orgAddress: "Улаанбаатар хот, БГД дүүрэг, 21 хороо, Горький 14-330",
  orgPhone: "91601316, 95606060",
  orgEmail: "Bigservice1316@gmail.com",
  orgWebsite: "MGLSTORE.MN",
};

/**
 * Read-only table for the "1.1 Холбооны мэдээлэл" section on the contract page.
 * Reads data from headerData.orgContact, falling back to defaults.
 */
export function OrgInfoTable({ data }: { data?: OrgContactInfo | null }) {
  const d = data || DEFAULT_ORG_CONTACT;

  const rows: [string, string, string?][] = [
    ["Байгууллагын нэр:", d.orgName, "text-[#c00000]"],
    ...(d.orgRegister ? [["Байгууллагын регистр", d.orgRegister] as [string, string]] : []),
    ["Хаяг:", d.orgAddress, "text-[#c00000]"],
    ["Утас:", d.orgPhone],
    ["И-мэйл:", d.orgEmail],
    ["Вэбсайт:", d.orgWebsite, "text-[#c00000] underline"],
  ];

  return (
    <>
      <div className="font-medium mb-2 text-[#c00000]">1.1 Холбооны мэдээлэл</div>
      <table className="contract-mobile-stack-table w-full text-sm border-collapse border border-[#b4c6e7] mb-6 font-sans">
        <tbody>
          {rows.map(([label, value, extraClass]) => (
            <tr key={label}>
              <td className="border border-[#b4c6e7] p-2 bg-[#f8f9fc] font-bold text-[#1e4e8c] w-1/3">{label}</td>
              <td className={`border border-[#b4c6e7] p-2 ${extraClass || ""}`}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
