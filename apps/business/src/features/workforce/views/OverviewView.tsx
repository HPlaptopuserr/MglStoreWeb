"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Bell, Clock3, List, MapPin, Send } from "lucide-react";
import { workforceRequestLabels } from "@mgl/types";
import type { WorkforceController } from "../hooks/useWorkforce";
import {
  Avatar,
  Empty,
  Panel,
  Stats,
  StatusBadge,
  minutes,
  time,
} from "../components/shared";
export function OverviewView({
  controller,
}: {
  controller: WorkforceController;
}) {
  const { data } = controller;
  const [map, setMap] = useState(false),
    [pulse, setPulse] = useState(false);
  if (!data) return null;
  const rows = data.rows.filter((r) => r.date === data.today),
    arrived = rows
      .filter((r) => r.clockIn)
      .sort((a, b) => (b.clockIn ?? "").localeCompare(a.clockIn ?? "")),
    pending = data.requests.filter((r) => r.state === "PENDING"),
    total = data.organization.activeMembers;
  const parts = [
    { label: "Ирсэн", count: arrived.length, color: "#28b68c" },
    {
      label: "Тасалсан",
      count: rows.filter((r) => r.status === "ABSENT").length,
      color: "#ef6868",
    },
    {
      label: "Чөлөөтэй",
      count: rows.filter((r) => r.status === "LEAVE").length,
      color: "#f5ba65",
    },
    {
      label: "Бусад",
      count: Math.max(
        0,
        total -
          arrived.length -
          rows.filter((r) => ["ABSENT", "LEAVE"].includes(r.status)).length,
      ),
      color: "#617384",
    },
  ];
  let offset = 0;
  const href = (name: string) =>
    `/attendance/${name}?organizationId=${data.organization.id}`;
  return (
    <>
      <Stats
        items={[
          { label: "Нийт ажилтан", value: total },
          { label: "Өнөөдөр ирсэн", value: arrived.length, tone: "green" },
          {
            label: "Хоцорсон",
            value: rows.filter((r) => r.status === "LATE").length,
            tone: "amber",
          },
          { label: "Хүлээгдэж буй хүсэлт", value: pending.length, tone: "red" },
        ]}
      />
      <div className="wf-dashboard-grid">
        <Panel
          title="Ирц"
          action={
            <Link href={href("reports")} aria-label="Ирцийн дэлгэрэнгүй">
              <ArrowUpRight size={18} />
            </Link>
          }
        >
          <div className="wf-donut">
            <svg
              viewBox="0 0 220 220"
              role="img"
              aria-label={`Өнөөдөр ${total} ажилтнаас ${arrived.length} ирсэн`}
            >
              <circle
                cx="110"
                cy="110"
                r="80"
                fill="none"
                stroke="#30384e"
                strokeWidth="26"
              />
              {parts.map((part) => {
                const length = total ? (part.count / total) * 100 : 0;
                const start = offset;
                offset += length;
                return (
                  <circle
                    key={part.label}
                    cx="110"
                    cy="110"
                    r="80"
                    fill="none"
                    stroke={part.color}
                    strokeWidth="26"
                    pathLength="100"
                    strokeDasharray={`${length} ${100 - length}`}
                    strokeDashoffset={-start}
                    transform="rotate(-90 110 110)"
                  />
                );
              })}
              <text
                x="110"
                y="105"
                textAnchor="middle"
                fill="currentColor"
                fontSize="32"
                fontWeight="700"
              >
                {arrived.length}
              </text>
              <text
                x="110"
                y="130"
                textAnchor="middle"
                fill="#91a0af"
                fontSize="12"
              >
                Өнөөдөр ирсэн
              </text>
            </svg>
          </div>
          <div className="wf-legend">
            {parts.map((p) => (
              <span key={p.label}>
                <i style={{ background: p.color }} />
                {p.label}
                <b>{p.count}</b>
              </span>
            ))}
          </div>
          <p className="wf-muted wf-panel-note">
            Өнөөдрийн мэдээлэл · {data.today}
          </p>
        </Panel>
        <Panel
          title="Ирсэн ажилчид"
          action={
            <div className="wf-segment">
              <button
                onClick={() => setMap(false)}
                className={!map ? "active" : ""}
                aria-label="Жагсаалтаар"
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setMap(true)}
                className={map ? "active" : ""}
                aria-label="Байршлаар"
              >
                <MapPin size={16} />
              </button>
            </div>
          }
        >
          {arrived.length ? (
            <div className="wf-item-list">
              {arrived.slice(0, 7).map((row) => (
                <div className="wf-list-row" key={row.id}>
                  <Avatar name={row.employeeName} />
                  <div>
                    <strong>{row.employeeName}</strong>
                    {map && (
                      <small>
                        {data.zones.find(
                          (z) =>
                            z.id ===
                            data.records.find((r) =>
                              row.recordIds.includes(r.id),
                            )?.zoneId,
                        )?.name ?? "Байршилгүй"}
                      </small>
                    )}
                  </div>
                  <span>{time(row.clockIn, data.policy.timeZone)}</span>
                  <i
                    className={`wf-dot ${row.status === "LATE" ? "amber" : "green"}`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="Өнөөдөр ирц бүртгэгдээгүй"
              description="Ажилтнууд апп дээр цаг бүртгэхэд энд харагдана."
            />
          )}
        </Panel>
        <Panel
          title="Хүлээгдэж буй хүсэлтүүд"
          action={
            <Link href={href("requests")} aria-label="Бүх хүсэлт">
              <Send size={18} />
            </Link>
          }
        >
          {pending.length ? (
            <div className="wf-item-list">
              {pending.slice(0, 7).map((request) => {
                const employee = data.employees.find(
                  (e) => e.userId === request.userId,
                );
                return (
                  <Link
                    className="wf-list-row"
                    href={href("requests")}
                    key={request.id}
                  >
                    <Avatar name={employee?.name ?? "А"} />
                    <div>
                      <strong>{employee?.name ?? "Ажилтан"}</strong>
                      <small>{workforceRequestLabels[request.kind]}</small>
                    </div>
                    <ArrowUpRight size={15} />
                  </Link>
                );
              })}
            </div>
          ) : (
            <Empty
              title="Шийдвэрлэх хүсэлт алга"
              description="Шинэ хүсэлт ирэхэд энд харагдана."
            />
          )}
        </Panel>
        <Panel title="Мэдэгдэл" action={<Bell size={18} />}>
          {data.notices.length ? (
            <div className="wf-item-list">
              {data.notices.slice(0, 3).map((n) => (
                <div className="wf-notice-mini" key={n.id}>
                  <strong>{n.title}</strong>
                  <p>{n.content}</p>
                  <small>
                    {n.createdAt.slice(0, 10)} · {n.userIds.length} хүлээн авагч
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="Мэдэгдэл илгээгээгүй" />
          )}
          <Link className="wf-link-button" href={href("notifications")}>
            Мэдэгдэл илгээх →
          </Link>
        </Panel>
        <Panel
          title={pulse ? "Сэтгэл ханамж" : "Цагийн гүйцэтгэл"}
          action={
            <button
              onClick={() => setPulse((v) => !v)}
              aria-label="Цагийн гүйцэтгэл, сэтгэл ханамж солих"
            >
              <Clock3 size={16} />
            </button>
          }
        >
          {pulse ? (
            <div className="wf-pulse">
              {data.pulse.map((p) => (
                <div key={p.score}>
                  <span>{["😢", "😟", "😐", "🙂", "😊"][p.score - 1]}</span>
                  <progress
                    max={Math.max(
                      1,
                      data.pulse.reduce((s, item) => s + item.count, 0),
                    )}
                    value={p.count}
                  />
                  <b>{p.count}</b>
                </div>
              ))}
              <small>Сонгосон хугацааны ажилтны үнэлгээ</small>
            </div>
          ) : (
            <div className="wf-performance">
              <strong>
                {data.summary.plannedMinutes
                  ? `${Math.round((data.summary.workedMinutes / data.summary.plannedMinutes) * 100)}%`
                  : "—"}
              </strong>
              <span>Сонгосон хугацааны ажилласан / төлөвлөсөн цаг</span>
              <progress
                max={Math.max(
                  data.summary.plannedMinutes,
                  data.summary.workedMinutes,
                  1,
                )}
                value={data.summary.workedMinutes}
              />
              <div>
                <span>
                  Ажилласан <b>{minutes(data.summary.workedMinutes)}</b>
                </span>
                <span>
                  Төлөвлөсөн <b>{minutes(data.summary.plannedMinutes)}</b>
                </span>
              </div>
            </div>
          )}
        </Panel>
        <Panel title="Анхаарах бүртгэл">
          <div className="wf-item-list">
            {data.rows
              .filter((r) => r.clockIn && !r.clockOut)
              .slice(0, 5)
              .map((row) => (
                <div className="wf-list-row" key={row.id}>
                  <Avatar name={row.employeeName} />
                  <div>
                    <strong>{row.employeeName}</strong>
                    <small>{row.date} · Явах цаг бүртгээгүй</small>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
              ))}
            {!data.rows.some((r) => r.clockIn && !r.clockOut) && (
              <Empty title="Нээлттэй бүртгэл алга" />
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
