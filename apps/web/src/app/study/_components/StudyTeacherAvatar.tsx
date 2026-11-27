"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";

export function StudyTeacherAvatar({
  teacher,
  className = "h-10 w-10 rounded-full",
}: {
  teacher: { name: string; imageUrl?: string };
  className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string>();
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-sky-100 font-bold text-sky-800 ${className}`}
    >
      <span aria-hidden="true">
        {teacher.name.trim().slice(0, 1) || <UserRound className="h-5 w-5" />}
      </span>
      {teacher.imageUrl && failedUrl !== teacher.imageUrl && (
        <img
          src={teacher.imageUrl}
          alt=""
          loading="lazy"
          onError={() => setFailedUrl(teacher.imageUrl)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </span>
  );
}
