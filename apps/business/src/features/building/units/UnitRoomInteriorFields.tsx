"use client";

import Image from "next/image";
import "./unit-rooms.css";
import { useState } from "react";
import type {
  BuildingUnitContent,
  UnitRoomInterior,
} from "@mgl/types/building-website";
import { uploadUnitImage } from "./upload-unit-image";

interface UnitRoomInteriorFieldsProps {
  projectId: string;
  count: number;
  value: BuildingUnitContent;
  onChange: (value: BuildingUnitContent) => void;
  onBusy: (busy: boolean) => void;
}
export function UnitRoomInteriorFields({
  projectId,
  count,
  value,
  onChange,
  onBusy,
}: UnitRoomInteriorFieldsProps) {
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const rooms = value.roomInteriors ?? [];
  function change(index: number, patch: Partial<UnitRoomInterior>) {
    const next = Array.from(
      { length: Math.max(count, rooms.length) },
      (_, number) => rooms[number] ?? { name: "", description: "", image: "" },
    );
    next[index] = { ...next[index], ...patch };
    onChange({ ...value, roomInteriors: next });
  }
  async function upload(index: number, file: File) {
    setBusy(index);
    onBusy(true);
    setError("");
    try {
      change(index, { image: await uploadUnitImage(projectId, file) });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Зураг оруулж чадсангүй.",
      );
    } finally {
      setBusy(null);
      onBusy(false);
    }
  }
  return (
    <fieldset className="unit-room-fields" disabled={busy !== null}>
      <legend>Өрөө тус бүрийн интерьер</legend>
      <p>
        Өрөөний тоогоор тусдаа зураг, нэр, тайлбар оруулна. Өөрчлөлтөө
        “Хадгалах” товчоор хадгална.
      </p>
      {!count && <p>Эхлээд “Мэдээлэл” хэсэгт өрөөний тоог оруулна уу.</p>}
      <div className="unit-room-editor-grid">
        {Array.from({ length: count }, (_, index) => {
          const room = rooms[index];
          return (
            <section key={index}>
              <h4>Өрөө {index + 1}</h4>
              <label>
                Өрөөний нэр
                <input
                  maxLength={100}
                  placeholder="Жишээ: Зочны өрөө"
                  value={room?.name ?? ""}
                  onChange={(event) =>
                    change(index, { name: event.target.value })
                  }
                />
              </label>
              <label>
                Тайлбар
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={room?.description ?? ""}
                  onChange={(event) =>
                    change(index, { description: event.target.value })
                  }
                />
              </label>
              <label>
                Интерьер зураг
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void upload(index, file);
                  }}
                />
              </label>
              {room?.image && (
                <>
                  <Image
                    src={room.image}
                    alt={`Өрөө ${index + 1}`}
                    width={280}
                    height={180}
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => change(index, { image: "" })}
                  >
                    Зураг хасах
                  </button>
                </>
              )}
              {busy === index && <p role="status">Зураг байршуулж байна…</p>}
            </section>
          );
        })}
      </div>
      {error && <p role="alert">{error}</p>}
    </fieldset>
  );
}
