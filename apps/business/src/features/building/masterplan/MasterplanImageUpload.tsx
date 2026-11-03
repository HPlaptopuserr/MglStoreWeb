"use client";
import { useRef, useState } from "react";
import { ImagePlus, UploadCloud } from "lucide-react";

export function MasterplanImageUpload({
  busy,
  hasImage,
  onUpload,
}: {
  busy: boolean;
  hasImage: boolean;
  onUpload: (file: File) => Promise<void>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  return (
    <div
      className={`masterplan-dropzone${dragging ? " is-dragging" : ""}${hasImage ? " is-compact" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!busy) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file && !busy) void onUpload(file);
      }}
    >
      <span className="masterplan-upload-icon">
        <ImagePlus size={28} aria-hidden="true" />
      </span>
      <h3>
        {hasImage
          ? "Ерөнхий зургийг солих"
          : "Хотхоны ерөнхий зургаа оруулна уу"}
      </h3>
      <p>
        {hasImage
          ? "Блокийн тэмдэглэгээ хадгалагдана. Шинэ зураг дээр байрлалыг нь шалгаарай."
          : "Дээрээс харсан зураг эсвэл ерөнхий төлөвлөлтөө энд чирж оруулаарай."}
      </p>
      <button
        type="button"
        className="building-primary"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        <UploadCloud size={16} aria-hidden="true" />{" "}
        {busy
          ? "Зураг боловсруулж байна…"
          : hasImage
            ? "Зураг солих"
            : "Зураг сонгох"}
      </button>
      <small>PNG, JPG, WebP · 20 MB хүртэл</small>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        disabled={busy}
        aria-label="Ерөнхий зураг сонгох"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void onUpload(file);
        }}
      />
    </div>
  );
}
