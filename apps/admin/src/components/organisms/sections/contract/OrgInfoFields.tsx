"use client";

import React from "react";
import { Building, Phone, Mail, Globe, MapPin } from "lucide-react";

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
 * Admin editor: editable fields for the organisation's (Холбоо) contact info
 * displayed in "1.1 Холбооны мэдээлэл" of the contract.
 */
export function OrgInfoEditor({
  value,
  onChange,
}: {
  value: OrgContactInfo;
  onChange: (v: OrgContactInfo) => void;
}) {
  const set = (key: keyof OrgContactInfo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [key]: e.target.value });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
        <Building className="w-4 h-4 text-[#1e4e8c]" />
        1.1 Холбооны мэдээлэл (гэрээнд харагдана)
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {([
          { key: "orgName" as const, label: "Байгууллагын нэр", icon: Building, placeholder: "жш: ЭМ ЖИ ЭЛ БМБЧ ПЬЮР" },
          { key: "orgRegister" as const, label: "Байгууллагын регистр", icon: Building, placeholder: "жш: 7236841" },
          { key: "orgAddress" as const, label: "Хаяг", icon: MapPin, placeholder: "жш: Улаанбаатар хот, БГД дүүрэг..." },
          { key: "orgPhone" as const, label: "Утас", icon: Phone, placeholder: "жш: 91601316, 95606060" },
          { key: "orgEmail" as const, label: "И-мэйл", icon: Mail, placeholder: "жш: Bigservice1316@gmail.com" },
          { key: "orgWebsite" as const, label: "Вэбсайт", icon: Globe, placeholder: "жш: MGLSTORE.MN" },
        ]).map(({ key, label, icon: Icon, placeholder }) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="flex items-center gap-1.5 text-sm font-medium text-neutral-700">
              <Icon className="w-3.5 h-3.5 text-neutral-400" /> {label}
            </label>
            <input
              type="text"
              value={value[key]}
              onChange={set(key)}
              placeholder={placeholder}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Read-only table rendered on the public contract page (web + admin sign pages).
 * Shows org contact information fetched from headerData.orgContact.
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
      <table className="w-full text-sm border-collapse border border-[#b4c6e7] mb-6 font-sans">
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
