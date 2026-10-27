"use client";
import { useState } from "react";
import Image from "next/image";
import { employeePhotoSource } from "./employee-photo";
export function EmployeeAvatar({
  name,
  src,
  large = false,
}: {
  name: string;
  src?: string | null;
  large?: boolean;
}) {
  const source = employeePhotoSource(src);
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span
      className={`wf-avatar wf-employee-avatar${large ? " wf-employee-avatar-large" : ""}`}
      role="img"
      aria-label={`${name} · ${source && failed !== source ? "Зураг" : "Нэрийн эхний үсэг"}`}
    >
      <span aria-hidden="true">{name.trim().slice(0, 1) || "А"}</span>
      {source && failed !== source && (
        <Image
          src={source}
          alt=""
          fill
          sizes={large ? "96px" : "36px"}
          unoptimized
          onError={() => setFailed(source)}
        />
      )}
    </span>
  );
}
