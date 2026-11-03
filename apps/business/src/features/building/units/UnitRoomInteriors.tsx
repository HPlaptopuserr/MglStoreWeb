"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Expand, ImageOff, Images } from "lucide-react";
import type { UnitRoomInterior } from "@mgl/types/building-website";
import { BuildingDialog } from "../management/BuildingDialog";
import "./unit-rooms.css";

interface UnitRoomInteriorsProps {
  count: number;
  rooms: UnitRoomInterior[];
  editUrl?: string;
}

function RoomImage({
  room,
  number,
}: {
  room: UnitRoomInterior;
  number: number;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  if (failed || !room.image)
    return (
      <div className="unit-room-image-empty">
        <ImageOff size={22} />
        <span>
          {failed ? "Зураг ачаалж чадсангүй" : "Интерьер зураг нэмэгдээгүй"}
        </span>
      </div>
    );
  return (
    <div className="unit-room-image">
      {!loaded && (
        <span className="unit-room-loading" role="status">
          Зураг ачаалж байна…
        </span>
      )}
      <Image
        src={room.image}
        alt={`Өрөө ${number}${room.name ? ` · ${room.name}` : ""} интерьер`}
        width={1000}
        height={750}
        unoptimized
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export function UnitRoomInteriors({
  count,
  rooms,
  editUrl,
}: UnitRoomInteriorsProps) {
  const [selected, setSelected] = useState<number | null>(null);
  if (!count) return null;
  const room =
    selected === null
      ? null
      : (rooms[selected] ?? { name: "", description: "", image: "" });
  return (
    <section className="unit-room-interiors" aria-label="Өрөөний интерьер">
      <header>
        <h2>
          <Images size={15} /> Өрөөний интерьер
        </h2>
        <span>{count} өрөө</span>
      </header>
      <div className="unit-room-cards">
        {Array.from({ length: count }, (_, index) => (
          <button
            key={index}
            type="button"
            className="unit-room-card"
            onClick={() => setSelected(index)}
            aria-label={`Өрөө ${index + 1}${rooms[index]?.name ? ` · ${rooms[index].name}` : ""} интерьер харах`}
          >
            {rooms[index]?.image ? (
              <RoomImage
                key={rooms[index].image}
                room={rooms[index]}
                number={index + 1}
              />
            ) : (
              <div className="unit-room-thumb-empty">
                <Images size={22} />
              </div>
            )}
            <span className="unit-room-card-title">
              Өрөө {index + 1}
              <Expand size={12} />
            </span>
            <small>
              {rooms[index]?.name ||
                (rooms[index]?.image ? "Интерьер харах" : "Зураг нэмэгдэнэ")}
            </small>
          </button>
        ))}
      </div>
      {selected !== null && room && (
        <BuildingDialog
          title={`Өрөө ${selected + 1}${room.name ? ` · ${room.name}` : ""}`}
          subtitle="Өрөөний интерьер"
          onClose={() => setSelected(null)}
          footer={
            <div className="unit-room-preview-navigation">
              <button
                type="button"
                disabled={selected === 0}
                onClick={() => setSelected(selected - 1)}
              >
                ← Өмнөх
              </button>
              <span>
                {selected + 1} / {count}
              </span>
              <button
                type="button"
                disabled={selected + 1 >= count}
                onClick={() => setSelected(selected + 1)}
              >
                Дараах →
              </button>
            </div>
          }
        >
          <div className="unit-room-preview">
            <RoomImage key={room.image} room={room} number={selected + 1} />
            {room.description && <p>{room.description}</p>}
            {editUrl && !room.image && (
              <Link href={editUrl}>Интерьер зураг нэмэх →</Link>
            )}
          </div>
        </BuildingDialog>
      )}
    </section>
  );
}
