"use client";
import { useState } from "react";
import { MapPin, Plus, Search } from "lucide-react";
import type { WorkforceZone } from "@mgl/types";
import type { WorkforceController } from "../hooks/useWorkforce";
import { Empty } from "../components/shared";
import { LocationDialog } from "../locations/LocationDialog";
export function LocationsView({
  controller,
}: {
  controller: WorkforceController;
}) {
  const { data, run, setToast } = controller;
  const [query, setQuery] = useState(""),
    [employee, setEmployee] = useState(""),
    [selected, setSelected] = useState(""),
    [edit, setEdit] = useState<Partial<WorkforceZone> | null>(null);
  if (!data) return null;
  const zones = data.zones.filter(
      (z) =>
        z.name.toLowerCase().includes(query.toLowerCase()) &&
        (!employee || z.userIds.includes(employee)),
    ),
    zone = zones.find((z) => z.id === selected) ?? zones[0];
  const delta = zone ? Math.max(0.004, zone.radiusMeters / 70000) : 0.02;
  const mapUrl = zone
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${zone.lng - delta}%2C${zone.lat - delta}%2C${zone.lng + delta}%2C${zone.lat + delta}&layer=mapnik&marker=${zone.lat}%2C${zone.lng}`
    : "";
  return (
    <>
      <div className="wf-toolbar">
        <p className="wf-muted">
          Ажилтны апптай ижил бүртгэлийн бүс ашиглана. Радиусыг метрээр
          тохируулна.
        </p>
        {data.session.canManage && (
          <button
            className="wf-primary"
            onClick={() =>
              setEdit({
                lat: 47.918,
                lng: 106.917,
                radiusMeters: 150,
                isActive: true,
              })
            }
          >
            <Plus size={16} /> Байршил нэмэх
          </button>
        )}
      </div>
      <div className="wf-locations">
        <section className="wf-panel wf-zone-list">
          <div className="wf-filters">
            <label>
              <Search size={16} />
              <input
                aria-label="Байршил хайх"
                placeholder="Байршил хайх…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              value={employee}
              onChange={(e) => setEmployee(e.target.value)}
              aria-label="Ажилтнаар байршил шүүх"
            >
              <option value="">Бүх ажилтан</option>
              {data.employees
                .filter((e) => e.active)
                .map((e) => (
                  <option key={e.userId} value={e.userId}>
                    {e.name}
                  </option>
                ))}
            </select>
          </div>
          {zones.length ? (
            zones.map((z) => (
              <article
                className={`wf-zone-card ${zone?.id === z.id ? "selected" : ""}`}
                key={z.id}
              >
                <button
                  className="wf-zone-title"
                  onClick={() => setSelected(z.id)}
                >
                  <MapPin size={20} />
                  <h2>{z.name}</h2>
                  <span>{z.isActive ? "Идэвхтэй" : "Архив"}</span>
                </button>
                <p>
                  {z.lat.toFixed(6)}, {z.lng.toFixed(6)}
                </p>
                <p>
                  Радиус: <strong>{z.radiusMeters}м</strong>
                </p>
                <p>
                  Хуваарьт оноосон ажилтан:{" "}
                  <strong>{new Set(z.userIds).size}</strong>
                </p>
                {data.session.canManage && (
                  <div className="wf-actions">
                    <button onClick={() => setEdit(z)}>Засах</button>
                    <button
                      onClick={() =>
                        void run(`zones/${z.id}`, "PATCH", {
                          ...z,
                          isActive: !z.isActive,
                        })
                          .then(() => setToast("Байршлын төлөв шинэчлэгдлээ"))
                          .catch((e) =>
                            setToast(e instanceof Error ? e.message : "Алдаа"),
                          )
                      }
                    >
                      {z.isActive ? "Архивлах" : "Идэвхжүүлэх"}
                    </button>
                  </div>
                )}
              </article>
            ))
          ) : (
            <Empty title="Байршил олдсонгүй" />
          )}
        </section>
        <section className="wf-map-panel">
          {zone ? (
            <>
              <iframe
                title={`${zone.name} газрын зураг`}
                src={mapUrl}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <div className="wf-map-caption">
                <MapPin size={16} />
                <strong>{zone.name}</strong>
                <span>{zone.radiusMeters}м радиустай бүртгэлийн бүс</span>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${zone.lat}&mlon=${zone.lng}#map=17/${zone.lat}/${zone.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Газрын зураг нээх ↗
                </a>
              </div>
            </>
          ) : (
            <Empty
              title="Байршил сонгоно уу"
              description="Байршил нэмсний дараа газрын зураг харагдана."
            />
          )}
        </section>
      </div>
      {edit && (
        <LocationDialog
          zone={edit}
          onClose={() => setEdit(null)}
          onSubmit={async (f) => {
            await run(
              edit.id ? `zones/${edit.id}` : "zones",
              edit.id ? "PATCH" : "POST",
              {
                name: f.get("name"),
                lat: Number(f.get("lat")),
                lng: Number(f.get("lng")),
                radiusMeters: Number(f.get("radius")),
                isActive: f.get("active") === "on",
              },
            );
            setToast("Байршил хадгалагдлаа");
          }}
        />
      )}
    </>
  );
}
