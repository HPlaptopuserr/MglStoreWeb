"use client";
import { useRef, type KeyboardEvent } from "react";
import {
  BriefcaseBusiness,
  HeartPulse,
  UserRound,
  Landmark,
} from "lucide-react";
export type EmployeeTab = "work" | "personal" | "payroll" | "emergency";
const tabs = [
  { id: "work", label: "Ажлын мэдээлэл", icon: BriefcaseBusiness },
  { id: "personal", label: "Хувийн мэдээлэл", icon: UserRound },
  { id: "payroll", label: "Цалингийн данс", icon: Landmark },
  { id: "emergency", label: "Яаралтай холбоо", icon: HeartPulse },
] as const;
export function EmployeeProfileTabs({
  active,
  onChange,
  privateVisible,
  id,
}: {
  active: EmployeeTab;
  onChange: (tab: EmployeeTab) => void;
  privateVisible: boolean;
  id: string;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const visible = privateVisible ? tabs : tabs.slice(0, 1);
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % visible.length;
    else if (event.key === "ArrowLeft")
      next = (index - 1 + visible.length) % visible.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = visible.length - 1;
    else return;
    event.preventDefault();
    onChange(visible[next].id);
    buttons.current[next]?.focus();
  }
  return (
    <div
      role="tablist"
      aria-label="Ажилтны мэдээллийн хэсгүүд"
      className="wf-profile-tabs"
    >
      {visible.map(({ id: tab, label, icon: Icon }, index) => (
        <button
          key={tab}
          ref={(node) => {
            buttons.current[index] = node;
          }}
          type="button"
          role="tab"
          id={`${id}-${tab}`}
          aria-selected={active === tab}
          aria-controls={`${id}-panel`}
          tabIndex={active === tab ? 0 : -1}
          onClick={() => onChange(tab)}
          onKeyDown={(event) => navigate(event, index)}
        >
          <Icon size={16} aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}
