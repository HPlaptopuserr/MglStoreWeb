"use client";
import { useCurrentTime } from "@/shared/hooks/useCurrentTime";
import type { WorkforceSnapshot } from "@mgl/types";
import { Panel, Stats } from "../components/shared";
export function EmployeeAnalytics({ data }: { data: WorkforceSnapshot }) {
  const now = useCurrentTime();
  const departments = [
    ...new Set(
      data.employees
        .filter((e) => e.active)
        .map((e) => e.department || "Хэлтэсгүй"),
    ),
  ];
  const joinCount = data.employees.filter(
    (e) =>
      e.joinedAt.slice(0, 10) >= data.range.from &&
      e.joinedAt.slice(0, 10) <= data.range.to,
  ).length;
  const years = data.employees
    .filter((e) => e.active && now !== null)
    .map((e) => ((now ?? 0) - +new Date(e.joinedAt)) / (365.25 * 86400000));
  return (
    <>
      <Stats
        items={[
          { label: "Нийт ажилтан", value: data.organization.activeMembers },
          { label: "Хугацаанд нэмэгдсэн", value: joinCount, tone: "green" },
          { label: "Хэлтсийн тоо", value: data.departments.length },
          {
            label: "Дундаж ажилласан хугацаа",
            value: years.length
              ? `${(years.reduce((a, b) => a + b, 0) / years.length).toFixed(1)} жил`
              : "—",
          },
        ]}
      />
      <Panel title="Ажиллах хүчний бүтэц">
        <div className="wf-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Хэлтэс</th>
                <th>Эзэмшигч</th>
                <th>Админ</th>
                <th>Ажилтан</th>
                <th>Нийт</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((name) => (
                <tr key={name}>
                  <td>{name}</td>
                  {["OWNER", "ADMIN", "STAFF"].map((role) => (
                    <td key={role}>
                      {
                        data.employees.filter(
                          (e) =>
                            e.active &&
                            (e.department || "Хэлтэсгүй") === name &&
                            e.role === role,
                        ).length
                      }
                    </td>
                  ))}
                  <td>
                    {
                      data.employees.filter(
                        (e) =>
                          e.active && (e.department || "Хэлтэсгүй") === name,
                      ).length
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="wf-panel-note wf-muted">
          Төрсөн огнооны баталгаатай өгөгдөлгүй тул дундаж нас тооцоогүй.
        </p>
      </Panel>
    </>
  );
}
export function RequestAnalytics({ data }: { data: WorkforceSnapshot }) {
  return (
    <>
      <Stats
        items={[
          { label: "Нийт хүсэлт", value: data.requests.length },
          {
            label: "Хүлээгдэж буй",
            value: data.requests.filter((r) => r.state === "PENDING").length,
            tone: "amber",
          },
          {
            label: "Зөвшөөрсөн",
            value: data.requests.filter((r) => r.state === "APPROVED").length,
            tone: "green",
          },
          {
            label: "Татгалзсан",
            value: data.requests.filter((r) => r.state === "REJECTED").length,
            tone: "red",
          },
        ]}
      />
      <Panel title="Хүсэлтийн төрөл ба шийдвэр">
        <div className="wf-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Төрөл</th>
                <th>Хүлээгдэж буй</th>
                <th>Зөвшөөрсөн</th>
                <th>Татгалзсан</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["REMOTE", "Зайнаас бүртгэл"],
                ["CORRECTION", "Цаг засвар"],
                ["LEAVE", "Чөлөө"],
                ["OVERTIME", "Илүү цаг"],
              ].map(([kind, label]) => (
                <tr key={kind}>
                  <td>{label}</td>
                  {["PENDING", "APPROVED", "REJECTED"].map((state) => (
                    <td key={state}>
                      {
                        data.requests.filter(
                          (r) => r.kind === kind && r.state === state,
                        ).length
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
