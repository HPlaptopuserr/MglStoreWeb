"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { WorkforceZone } from "@mgl/types";
import { Field, FormDialog } from "../components/shared";
const LocationMap = dynamic(() => import("./LocationMap"), {
  ssr: false,
  loading: () => <p role="status">Газрын зураг ачаалж байна…</p>,
});
interface Props {
  zone: Partial<WorkforceZone>;
  onClose: () => void;
  onSubmit: (form: FormData) => Promise<void>;
}
export function LocationDialog({ zone, onClose, onSubmit }: Props) {
  const [lat, setLat] = useState(String(zone.lat ?? 47.918));
  const [lng, setLng] = useState(String(zone.lng ?? 106.917));
  const [radius, setRadius] = useState(String(zone.radiusMeters ?? 150));
  const valid =
    lat !== "" &&
    lng !== "" &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng)) &&
    Math.abs(Number(lat)) <= 90 &&
    Math.abs(Number(lng)) <= 180;
  return (
    <FormDialog
      title={zone.id ? "Байршил засах" : "Байршил нэмэх"}
      onClose={onClose}
      onSubmit={onSubmit}
    >
      <Field label="Байршлын нэр">
        <input name="name" required defaultValue={zone.name} maxLength={150} />
      </Field>
      <LocationMap
        lat={valid ? Number(lat) : 47.918}
        lng={valid ? Number(lng) : 106.917}
        radius={Math.min(10000, Math.max(10, Number(radius) || 150))}
        onChange={(point) => {
          setLat(String(point.lat));
          setLng(String(point.lng));
        }}
      />
      <div className="wf-form-grid">
        <Field label="Өргөрөг">
          <input
            name="lat"
            type="number"
            step="any"
            min={-90}
            max={90}
            value={lat}
            onChange={(event) => setLat(event.target.value)}
            required
          />
        </Field>
        <Field label="Уртраг">
          <input
            name="lng"
            type="number"
            step="any"
            min={-180}
            max={180}
            value={lng}
            onChange={(event) => setLng(event.target.value)}
            required
          />
        </Field>
      </div>
      <Field label="Радиус (метр)">
        <input
          name="radius"
          type="number"
          min={10}
          max={10000}
          value={radius}
          onChange={(event) => setRadius(event.target.value)}
          required
        />
      </Field>
      <label className="wf-checkbox">
        <input type="checkbox" name="active" defaultChecked={zone.isActive} />{" "}
        Идэвхтэй
      </label>
    </FormDialog>
  );
}
