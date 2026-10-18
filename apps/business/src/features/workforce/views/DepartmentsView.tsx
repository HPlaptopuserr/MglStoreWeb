"use client";
import { useState } from "react";
import { GitBranch, List, Plus, ShieldCheck, UserPlus } from "lucide-react";
import type { WorkforceDepartment } from "@mgl/types";
import type { WorkforceController } from "../useWorkforce";
import { OrganizationTree } from "../components/OrganizationTree";
import {
  EmployeeSelect,
  Empty,
  Field,
  FormDialog,
  Panel,
} from "../components/shared";
export function DepartmentsView({
  controller,
}: {
  controller: WorkforceController;
}) {
  const { data, run, setToast } = controller;
  const [tree, setTree] = useState(true),
    [edit, setEdit] = useState<Partial<WorkforceDepartment> | null>(null),
    [remove, setRemove] = useState<WorkforceDepartment | null>(null),
    [assign, setAssign] = useState(false),
    [rights, setRights] = useState(false),
    [rightsDepartment, setRightsDepartment] = useState("");
  if (!data) return null;
  const unassigned = data.employees.filter(
    (e) => e.active && !e.department,
  ).length;
  const managerName = (id: string | null) =>
    data.employees.find((e) => e.userId === id)?.name ?? "Удирдлага оноогоогүй";
  const count = (name: string) =>
    data.employees.filter((e) => e.active && e.department === name).length;

  return (
    <>
      <div className="wf-toolbar">
        <div className="wf-segment">
          <button
            className={tree ? "active" : ""}
            aria-pressed={tree}
            onClick={() => setTree(true)}
          >
            <GitBranch size={16} /> Шатлал
          </button>
          <button
            className={!tree ? "active" : ""}
            aria-pressed={!tree}
            onClick={() => setTree(false)}
          >
            <List size={16} /> Жагсаалт
          </button>
        </div>
        <div className="wf-actions">
          <span className="wf-badge">Хэлтэсгүй ажилтан: {unassigned}</span>
          {data.session.canManage && (
            <>
              <button
                onClick={() => setAssign(true)}
                disabled={!unassigned || !data.departments.length}
              >
                <UserPlus size={16} />
                Алба, хэлтэст оруулах
              </button>
              <button
                onClick={() => setRights(true)}
                disabled={!data.departments.length}
              >
                <ShieldCheck size={16} />
                Админ эрх
              </button>
            </>
          )}
          {data.session.canManage && (
            <button className="wf-primary" onClick={() => setEdit({})}>
              <Plus size={16} /> Алба, хэлтэс нэмэх
            </button>
          )}
        </div>
      </div>
      <Panel title="Байгууллагын бүтэц">
        {data.departments.length ? (
          tree ? (
            <OrganizationTree
              name={data.organization.name}
              departments={data.departments}
              employees={data.employees}
              canEdit={data.session.canManage}
              onEdit={setEdit}
            />
          ) : (
            <div className="wf-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Хэлтэс</th>
                    <th>Дээд хэлтэс</th>
                    <th>Удирдлага</th>
                    <th>Ажилтны тоо</th>
                    <th>Үйлдэл</th>
                  </tr>
                </thead>
                <tbody>
                  {data.departments.map((d) => (
                    <tr key={d.id}>
                      <td>{d.name}</td>
                      <td>
                        {data.departments.find((p) => p.id === d.parentId)
                          ?.name ?? "Үндсэн"}
                      </td>
                      <td>{managerName(d.managerId)}</td>
                      <td>{count(d.name)}</td>
                      <td>
                        {data.session.canManage && (
                          <div className="wf-actions">
                            <button onClick={() => setEdit(d)}>Засах</button>
                            <button onClick={() => setRemove(d)}>Устгах</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <Empty
            title="Алба, хэлтэс бүртгээгүй"
            description="Байгууллагын бүтэц үүсгэж, ажилтнуудыг хэлтэст хуваарилаарай."
          />
        )}
      </Panel>
      {edit && (
        <FormDialog
          title={edit.id ? "Хэлтэс засах" : "Хэлтэс нэмэх"}
          onClose={() => setEdit(null)}
          onSubmit={async (f) => {
            await run(
              edit.id ? `departments/${edit.id}` : "departments",
              edit.id ? "PATCH" : "POST",
              {
                name: f.get("name"),
                parentId: f.get("parentId"),
                managerId: f.get("managerId"),
              },
            );
            setToast("Хэлтэс хадгалагдлаа");
          }}
        >
          <Field label="Хэлтсийн нэр">
            <input
              name="name"
              defaultValue={edit.name}
              required
              maxLength={120}
            />
          </Field>
          <Field label="Дээд хэлтэс">
            <select name="parentId" defaultValue={edit.parentId ?? ""}>
              <option value="">Үндсэн байгууллага</option>
              {data.departments
                .filter((d) => d.id !== edit.id)
                .map((d) => (
                  <option value={d.id} key={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Хариуцсан удирдлага">
            <select name="managerId" defaultValue={edit.managerId ?? ""}>
              <option value="">Оноогоогүй</option>
              {data.employees
                .filter((e) => e.active)
                .map((e) => (
                  <option key={e.userId} value={e.userId}>
                    {e.name}
                  </option>
                ))}
            </select>
          </Field>
        </FormDialog>
      )}
      {remove && (
        <FormDialog
          title="Хэлтэс устгах"
          submitLabel="Устгах"
          onClose={() => setRemove(null)}
          onSubmit={async () => {
            await run(`departments/${remove.id}`, "DELETE");
            setToast("Хэлтэс устгагдлаа");
          }}
        >
          <p>
            “{remove.name}” хэлтсийг устгана. Дэд хэлтэс болон ажилтангүй үед
            устгах боломжтой.
          </p>
        </FormDialog>
      )}
      {assign && (
        <FormDialog
          title="Хэлтэсгүй ажилтнуудыг оноох"
          onClose={() => setAssign(false)}
          onSubmit={async (f) => {
            await run("employees/assign-department", "POST", {
              userIds: f.getAll("userIds"),
              departmentId: f.get("departmentId"),
            });
            setToast("Ажилтнуудыг хэлтэст хуваариллаа");
          }}
        >
          <Field label="Ажилтнууд">
            <EmployeeSelect
              employees={data.employees.filter(
                (e) => e.active && !e.department,
              )}
              multiple
              name="userIds"
            />
          </Field>
          <Field label="Алба, хэлтэс">
            <select name="departmentId" required>
              <option value="">Хэлтэс сонгох</option>
              {data.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
        </FormDialog>
      )}
      {rights && (
        <FormDialog
          title="Хэлтсийн удирдах эрх"
          onClose={() => setRights(false)}
          onSubmit={async (f) => {
            const department = data.departments.find(
              (d) => d.id === f.get("departmentId"),
            );
            if (!department) throw new Error("Хэлтэс сонгоно уу");
            await run(`departments/${department.id}`, "PATCH", {
              name: department.name,
              parentId: department.parentId,
              managerId: f.get("managerId"),
            });
            setToast("Хэлтсийн удирдах эрх шинэчлэгдлээ");
          }}
        >
          <p className="wf-muted">
            Хэлтсийн удирдлага хариуцсан ажилтныхаа ирц, хуваарь болон хүсэлтийг
            удирдана. Байгууллагын нийт админы эрх олгохгүй.
          </p>
          <Field label="Алба, хэлтэс">
            <select
              name="departmentId"
              required
              value={rightsDepartment}
              onChange={(e) => setRightsDepartment(e.target.value)}
            >
              <option value="">Хэлтэс сонгох</option>
              {data.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Хэлтсийн удирдлага">
            <select
              key={rightsDepartment}
              name="managerId"
              defaultValue={
                data.departments.find((d) => d.id === rightsDepartment)
                  ?.managerId ?? ""
              }
            >
              <option value="">Удирдлага оноохгүй</option>
              {data.employees
                .filter((e) => e.active)
                .map((e) => (
                  <option key={e.userId} value={e.userId}>
                    {e.name}
                  </option>
                ))}
            </select>
          </Field>
        </FormDialog>
      )}
    </>
  );
}
