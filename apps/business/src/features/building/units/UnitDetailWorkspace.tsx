"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type UnitView = "overview" | "plan" | "payment" | "gallery" | "project";

interface UnitDetailWorkspaceProps {
  title: string;
  back: string;
  breadcrumbs: ReactNode;
  overview: ReactNode;
  payment: ReactNode;
  gallery: ReactNode;
  project: ReactNode;
  hasGallery: boolean;
  preview: boolean;
}

export function UnitDetailWorkspace(props: UnitDetailWorkspaceProps) {
  const [view, setView] = useState<UnitView>("overview");
  const navigation: { id: UnitView; label: string }[] = [
    { id: "overview", label: "Байрны мэдээлэл" },
    { id: "plan", label: "План зураг" },
    { id: "payment", label: "Үнэ, төлбөр" },
    ...(props.hasGallery
      ? [{ id: "gallery" as const, label: "Интерьер" }]
      : []),
    { id: "project", label: "Хотхоны тухай" },
  ];
  return (
    <main className="unit-detail unit-workspace" data-view={view}>
      <header className="unit-detail-header">
        <Link href={props.back}>
          <ArrowLeft size={16} /> Давхар руу буцах
        </Link>
        <span className="unit-project-wordmark">{props.title}</span>
        <span className="unit-workspace-mode">
          {props.preview ? "Урьдчилан харах" : "Таны ирээдүйн гэр"}
        </span>
      </header>
      <div className="unit-workspace-navigation">
        {props.breadcrumbs}
        <nav aria-label="Байрны мэдээллийн хэсгүүд">
          {navigation.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`unit-workspace-tab unit-workspace-tab-${item.id}`}
              aria-pressed={view === item.id}
              onClick={() => setView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="unit-workspace-body">
        <div
          className="unit-workspace-overview"
          hidden={view !== "overview" && view !== "plan"}
        >
          {props.overview}
        </div>
        <div className="unit-workspace-panel" hidden={view !== "payment"}>
          {props.payment}
        </div>
        <div className="unit-workspace-panel" hidden={view !== "gallery"}>
          {props.gallery}
        </div>
        <div className="unit-workspace-panel" hidden={view !== "project"}>
          {props.project}
        </div>
      </div>
    </main>
  );
}
