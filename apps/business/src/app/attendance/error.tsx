"use client";
import { CircleAlert } from "lucide-react";
import "@/features/workforce/workforce.css";
export default function AttendanceError({ reset }: { reset: () => void }) {
  return (
    <div className="wf wf-route-loading" role="alert">
      <div>
        <span className="wf-route-loading-icon">
          <CircleAlert size={32} />
        </span>
        <strong>Цагийн удирдлагыг нээж чадсангүй</strong>
        <p>Дахин оролдоно уу. Хадгалсан мэдээлэл хэвээр байна.</p>
        <button className="wf-primary" onClick={reset}>
          Дахин оролдох
        </button>
      </div>
    </div>
  );
}
