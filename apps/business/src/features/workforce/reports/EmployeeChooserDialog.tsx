"use client";
import { useEffect, useId, useRef, useState } from "react";
import { X, Search } from "lucide-react";
import type { WorkforceSnapshot } from "@mgl/types";
import { ReportEmployeePicker } from "./ReportEmployeePicker";
export function EmployeeChooserDialog({
  data,
  onSelect,
  onClose,
}: {
  data: WorkforceSnapshot;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    searchInput = useRef<HTMLInputElement>(null),
    titleId = useId();
  const [query, setQuery] = useState(""),
    [department, setDepartment] = useState("");
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    searchInput.current?.focus();
    return () => node?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="wf wf-dialog wf-employee-chooser"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header>
        <div>
          <h2 id={titleId}>Ажилтан сонгох</h2>
          <p>Тайлан харах ажилтныхаа нэр дээр дарна уу.</p>
        </div>
        <button onClick={onClose} aria-label="Сонголт хаах">
          <X size={19} />
        </button>
      </header>
      <div className="wf-chooser-search">
        <label>
          <Search size={17} aria-hidden="true" />
          <input
            ref={searchInput}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Нэрээр хайх…"
            aria-label="Ажилтан хайх"
          />
        </label>
        <select
          aria-label="Ажилтны хэлтэс"
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
        >
          <option value="">Бүх хэлтэс</option>
          {data.departments.map((item) => (
            <option key={item.id} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div className="wf-chooser-list">
        <ReportEmployeePicker
          employees={data.employees}
          query={query}
          department={department}
          onSelect={onSelect}
        />
      </div>
    </dialog>
  );
}
