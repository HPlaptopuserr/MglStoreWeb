"use client";
import { Building2, Check, Plus, Save } from "lucide-react";
import { MasterplanImageUpload } from "./MasterplanImageUpload";
import { useState } from "react";
import Link from "next/link";
import type {
  ProjectMasterplan,
  WebsiteProject,
} from "@mgl/types/building-website";
import { managementFetch, responseError } from "@/features/building/api/management-client";
import { readPlanImage } from "../plans/plan-storage";
import { ProjectMasterplanView } from "./ProjectMasterplanView";

export function ProjectMasterplanEditor({
  project,
  onSaved,
}: {
  project: WebsiteProject;
  onSaved: () => void;
}) {
  const [value, setValue] = useState<ProjectMasterplan>(
    project.website.masterplan ?? { image: "", pins: [] },
  );
  const [revision, setRevision] = useState(project.updatedAt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty =
    JSON.stringify(value) !==
    JSON.stringify(project.website.masterplan ?? { image: "", pins: [] });
  async function save() {
    setBusy(true);
    setError("");
    try {
      const response = await managementFetch(
        "admin/projects/" + project.id + "/website",
        {
          method: "PATCH",
          body: JSON.stringify({ updatedAt: revision, masterplan: value }),
        },
      );
      if (!response.ok)
        throw new Error(await responseError(response, "Хадгалж чадсангүй."));
      const result: { project: { updatedAt: string } } = await response.json();
      setRevision(result.project.updatedAt);
      const verification = await managementFetch(
        "admin/projects/" + project.id + "/website",
      );
      if (!verification.ok)
        throw new Error(
          await responseError(
            verification,
            "Хадгалалтыг баталгаажуулж чадсангүй. Зураг энд хэвээр байна.",
          ),
        );
      const saved: { project: WebsiteProject } = await verification.json();
      setRevision(saved.project.updatedAt);
      if (
        JSON.stringify(saved.project.website.masterplan) !==
        JSON.stringify(value)
      )
        throw new Error(
          "Сервер зураг, байрлалыг буцааж өгсөнгүй. Өөрчлөлтөө хадгалсан гэж үзээгүй; дахин хадгална уу.",
        );
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Хадгалж чадсангүй.");
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      const image = await readPlanImage(file);
      setValue((current) => ({ ...current, image }));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Зураг оруулахад алдаа гарлаа.",
      );
    } finally {
      setBusy(false);
    }
  }
  const placedCount = project.blocks.filter((block) =>
    value.pins.some((pin) => pin.blockId === block.id),
  ).length;
  return (
    <section className="masterplan-editor" aria-busy={busy}>
      <header>
        <div>
          <h2>Ерөнхий төлөвлөлт</h2>
          <p>Хотхоны зураг дээр блокуудаа байрлуулна.</p>
        </div>
        <div className="masterplan-save">
          <small role="status">
            {dirty ? "Хадгалаагүй өөрчлөлт" : "Өөрчлөлт ороогүй"}
          </small>
          <button
            type="button"
            className="building-primary"
            disabled={busy || !dirty}
            onClick={() => void save()}
          >
            <Save size={16} aria-hidden="true" />
            {busy ? "Боловсруулж байна…" : "Хадгалах"}
          </button>
        </div>
      </header>
      <ol className="masterplan-steps" aria-label="Тохируулах дараалал">
        <li className={value.image ? "is-done" : "is-current"}>
          <span>{value.image ? <Check size={14} /> : "1"}</span>Зураг оруулах
        </li>
        <li className={value.image ? "is-current" : ""}>
          <span>2</span>Блок байрлуулах
        </li>
        <li>
          <span>3</span>Хадгалж шалгах
        </li>
      </ol>
      {error && (
        <p role="alert" className="building-alert">
          {error}
        </p>
      )}
      <div className="masterplan-editor-layout">
        <aside>
          <div className="masterplan-block-heading">
            <h3>Блокууд</h3>
            <span>
              {placedCount} / {project.blocks.length}
            </span>
          </div>
          <p className="masterplan-sidebar-hint">
            {value.image
              ? "Блокоо нэмээд зураг дээрх тэмдэглэгээг чирж байрлуулна."
              : "Эхлээд ерөнхий зургаа оруулаарай."}
          </p>
          {!project.blocks.length && (
            <p>Блок бүртгэсний дараа энд харагдана.</p>
          )}
          {project.blocks.map((block) => {
            const placed = value.pins.some((pin) => pin.blockId === block.id);
            return (
              <div
                className={`masterplan-block-row${placed ? " is-placed" : ""}`}
                key={block.id}
              >
                <span className="masterplan-block-icon">
                  <Building2 size={19} aria-hidden="true" />
                </span>
                <div>
                  <strong>{block.name}</strong>
                  <small>
                    {block.floors.length} давхар ·{" "}
                    {placed ? "Байрлуулсан" : "Байрлуулаагүй"}
                  </small>
                </div>
                <button
                  type="button"
                  aria-label={`${block.name}: ${placed ? "зургаас авах" : "байрлуулах"}`}
                  title={placed ? "Зургаас авах" : "Байрлуулах"}
                  disabled={busy || !value.image}
                  onClick={() =>
                    setValue((current) => ({
                      ...current,
                      pins: placed
                        ? current.pins.filter((pin) => pin.blockId !== block.id)
                        : [
                            ...current.pins,
                            {
                              blockId: block.id,
                              x: 30 + (current.pins.length % 3) * 20,
                              y:
                                30 +
                                (Math.floor(current.pins.length / 3) % 3) * 20,
                            },
                          ],
                    }))
                  }
                >
                  {placed ? <Check size={16} /> : <Plus size={16} />}
                </button>
              </div>
            );
          })}
          <Link
            className="masterplan-manage-link"
            href={`/building/manage/${project.id}/edit`}
          >
            <Plus size={15} /> Блок нэмэх, засах
          </Link>
          {value.image && (
            <MasterplanImageUpload busy={busy} hasImage onUpload={upload} />
          )}
        </aside>
        <div className="masterplan-workarea">
          <div className="masterplan-workarea-heading">
            <strong>Блокийн байршил</strong>
            <span>{placedCount} блок байрлуулсан</span>
          </div>
          {value.image ? (
            <ProjectMasterplanView
              project={project}
              value={value}
              onChange={busy ? undefined : setValue}
            />
          ) : (
            <MasterplanImageUpload
              busy={busy}
              hasImage={false}
              onUpload={upload}
            />
          )}
          <footer>
            Зураг дээр чирж зөөнө · Сумтай товчоор нарийвчилна · Shift + сум:
            том алхам
          </footer>
        </div>
      </div>
    </section>
  );
}
