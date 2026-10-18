"use client";
import { useState, type ReactNode } from "react";
import { Building2, Pencil, Users, ZoomIn, ZoomOut } from "lucide-react";
import type { WorkforceDepartment, WorkforceEmployee } from "@mgl/types";
interface OrganizationTreeProps {
  name: string;
  departments: WorkforceDepartment[];
  employees: WorkforceEmployee[];
  canEdit: boolean;
  onEdit: (department: WorkforceDepartment) => void;
}
export function OrganizationTree({
  name,
  departments,
  employees,
  canEdit,
  onEdit,
}: OrganizationTreeProps) {
  const [scale, setScale] = useState(1);
  const count = (name: string) =>
    employees.filter((e) => e.active && e.department === name).length;
  function branch(
    parentId: string | null,
    visited: Set<string> = new Set(),
  ): ReactNode {
    if (visited.size > 20) return null;
    return (
      <div className="wf-tree-children">
        {departments
          .filter((d) => d.parentId === parentId && !visited.has(d.id))
          .map((department) => (
            <div className="wf-tree-branch" key={department.id}>
              <button
                className="wf-tree-node"
                disabled={!canEdit}
                onClick={() => onEdit(department)}
              >
                <span className="wf-tree-node-title">
                  <Building2 size={20} />
                  <strong>{department.name}</strong>
                  {canEdit && <Pencil size={13} />}
                </span>
                <span className="wf-tree-member-count">
                  <Users size={15} />
                  {count(department.name)} ажилтан
                </span>
                <small>
                  {employees.find((e) => e.userId === department.managerId)
                    ?.name ?? "Удирдлага оноогоогүй"}
                </small>
              </button>
              {branch(department.id, new Set([...visited, department.id]))}
            </div>
          ))}
      </div>
    );
  }
  return (
    <div className="wf-org-chart">
      <div className="wf-chart-controls">
        <button
          aria-label="Зураглал жижигрүүлэх"
          onClick={() =>
            setScale((s) => Math.max(0.5, Math.round((s - 0.1) * 10) / 10))
          }
          disabled={scale <= 0.5}
        >
          <ZoomOut size={17} />
        </button>
        <button
          aria-label="Зураглалын хэмжээг сэргээх"
          onClick={() => setScale(1)}
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          aria-label="Зураглал томруулах"
          onClick={() =>
            setScale((s) => Math.min(2, Math.round((s + 0.1) * 10) / 10))
          }
          disabled={scale >= 2}
        >
          <ZoomIn size={17} />
        </button>
      </div>
      <div className="wf-tree-viewport">
        <div className="wf-tree-canvas" style={{ zoom: scale }}>
          <div className="wf-tree-root">
            <span className="wf-tree-brand">
              <Building2 size={30} />
            </span>
            <strong>{name}</strong>
          </div>
          {branch(null)}
        </div>
      </div>
    </div>
  );
}
