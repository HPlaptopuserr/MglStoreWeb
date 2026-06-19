"use client";

import { useEffect, useRef, useState } from "react";
import type { ServiceCategory, ServiceItem } from "@/lib/sections/types";
import { API, adminFetch } from "@/lib/api";
import { HrEmptyHeadingsState } from "@/components/molecules/sections/hr-services/HrEmptyHeadingsState";
import { HrEmptyMaterialsState } from "@/components/molecules/sections/hr-services/HrEmptyMaterialsState";
import { HrHeadingEditor } from "@/components/molecules/sections/hr-services/HrHeadingEditor";
import { HrHeadingOrderList } from "@/components/molecules/sections/hr-services/HrHeadingOrderList";
import { HrHeadingSidebar } from "@/components/molecules/sections/hr-services/HrHeadingSidebar";
import { HrMaterialCard } from "@/components/molecules/sections/hr-services/HrMaterialCard";
import { HrServicesHeader } from "@/components/molecules/sections/hr-services/HrServicesHeader";
import {
  createHrHeading,
  createHrMaterial,
  getHrMaterials,
  withHrMaterials,
} from "./hr-services-utils";
import { useHrAdminForms } from "./useHrAdminForms";

const PDF_UPLOAD_LIMIT_BYTES = 200 * 1024 * 1024;

function formatUploadSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

type HrServicesSectionProps = {
  hrServices: ServiceCategory[];
  setHrServices: (
    update:
      | ServiceCategory[]
      | ((prev: ServiceCategory[]) => ServiceCategory[]),
  ) => void;
  onSave: () => Promise<boolean | void> | boolean | void;
  saving?: boolean;
  saved?: boolean;
};

export function HrServicesSection({
  hrServices,
  setHrServices,
  onSave,
  saving,
  saved,
}: HrServicesSectionProps) {
  const [activeId, setActiveId] = useState<string | null>(
    hrServices[0]?.id ?? null,
  );
  const [uploadingTarget, setUploadingTarget] = useState<{
    id: string;
    kind: "pdf" | "heading-image" | "material-image";
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { activeForms, loadingForms } = useHrAdminForms();

  const activeHeading =
    hrServices.find((heading) => heading.id === activeId) ?? hrServices[0];
  const activeMaterials = activeHeading ? getHrMaterials(activeHeading) : [];
  const activeFormCount = activeMaterials.filter(
    (item) => item.hasForm && item.formSlug,
  ).length;

  useEffect(() => {
    if (hrServices.length === 0) {
      if (activeId !== null) setActiveId(null);
      return;
    }

    if (!activeId || !hrServices.some((heading) => heading.id === activeId)) {
      setActiveId(hrServices[0].id);
    }
  }, [activeId, hrServices]);

  const updateHeadings = (
    updater: (items: ServiceCategory[]) => ServiceCategory[],
  ) => {
    setHrServices((prev) => updater(prev));
  };

  const addHeading = () => {
    const heading = createHrHeading();
    setHrServices((prev) => [...prev, heading]);
    setActiveId(heading.id);
  };

  const updateHeading = (
    headingId: string,
    patch: Partial<ServiceCategory>,
  ) => {
    updateHeadings((prev) =>
      prev.map((heading) =>
        heading.id === headingId ? { ...heading, ...patch } : heading,
      ),
    );
  };

  const removeHeading = (headingId: string) => {
    if (!confirm("Энэ гол гарчиг болон доторх бүх материалыг устгах уу?")) {
      return;
    }
    updateHeadings((prev) =>
      prev.filter((heading) => heading.id !== headingId),
    );
  };

  const moveHeading = (headingId: string, direction: -1 | 1) => {
    updateHeadings((prev) => {
      const index = prev.findIndex((heading) => heading.id === headingId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const addMaterial = (headingId: string) => {
    updateHeadings((prev) =>
      prev.map((heading) =>
        heading.id === headingId
          ? withHrMaterials(heading, (items) => [...items, createHrMaterial()])
          : heading,
      ),
    );
  };

  const updateMaterial = (
    headingId: string,
    itemId: string,
    patch: Partial<ServiceItem>,
  ) => {
    updateHeadings((prev) =>
      prev.map((heading) =>
        heading.id === headingId
          ? withHrMaterials(heading, (items) =>
              items.map((item) =>
                item.id === itemId ? { ...item, ...patch } : item,
              ),
            )
          : heading,
      ),
    );
  };

  const removeMaterial = (headingId: string, itemId: string) => {
    updateHeadings((prev) =>
      prev.map((heading) =>
        heading.id === headingId
          ? withHrMaterials(heading, (items) =>
              items.filter((item) => item.id !== itemId),
            )
          : heading,
      ),
    );
  };

  const selectForm = (headingId: string, itemId: string, formSlug: string) => {
    const form = activeForms.find((candidate) => candidate.slug === formSlug);
    updateMaterial(headingId, itemId, {
      hasForm: Boolean(formSlug),
      formSlug,
      formTitle: form?.title ?? "",
    });
  };

  const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !activeHeading || !uploadingTarget) return;

    try {
      const form = new FormData();
      const isImage = uploadingTarget.kind !== "pdf";
      if (!isImage && file.size > PDF_UPLOAD_LIMIT_BYTES) {
        throw new Error(
          `PDF файл 200MB-аас их байна (${formatUploadSize(file.size)}).`,
        );
      }
      form.append(isImage ? "image" : "pdf", file);
      const res = await adminFetch(
        isImage
          ? `${API}/site-settings/banner-upload`
          : `${API}/site-settings/project-pdf-upload`,
        {
          method: "POST",
          body: form,
        },
      );
      if (!res.ok) throw new Error("Upload хийхэд алдаа гарлаа");
      const data = (await res.json()) as { url?: string };
      if (!data.url) throw new Error("Upload холбоос буцаж ирсэнгүй");
      if (uploadingTarget.kind === "heading-image") {
        updateHeading(uploadingTarget.id, {
          images: [
            {
              id: Math.random().toString(36).slice(2, 10),
              url: data.url,
              caption: "",
            },
          ],
        });
      } else if (uploadingTarget.kind === "material-image") {
        updateMaterial(activeHeading.id, uploadingTarget.id, {
          imageUrl: data.url,
        });
      } else {
        updateMaterial(activeHeading.id, uploadingTarget.id, {
          fileUrl: data.url,
          fileName: file.name,
        });
      }
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Upload хийхэд алдаа гарлаа",
      );
    } finally {
      setUploadingTarget(null);
    }
  };

  return (
    <div className="space-y-5">
      <HrServicesHeader
        onAddHeading={addHeading}
        onSave={onSave}
        saving={saving}
        saved={saved}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept={
          uploadingTarget?.kind === "pdf" ? "application/pdf,.pdf" : "image/*"
        }
        onChange={uploadFile}
        className="hidden"
      />

      {hrServices.length === 0 ? (
        <HrEmptyHeadingsState onAddHeading={addHeading} />
      ) : (
        <>
          <HrHeadingOrderList
            headings={hrServices}
            activeHeadingId={activeHeading?.id}
            onSelect={setActiveId}
            onMove={moveHeading}
          />

          <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
            <HrHeadingSidebar
              headings={hrServices}
              activeHeadingId={activeHeading?.id}
              onSelect={setActiveId}
            />

            {activeHeading && (
              <section className="space-y-4 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <HrHeadingEditor
                  heading={activeHeading}
                  formCount={activeFormCount}
                  onUpdate={(patch) => updateHeading(activeHeading.id, patch)}
                  onMove={(direction) =>
                    moveHeading(activeHeading.id, direction)
                  }
                  onRemove={() => removeHeading(activeHeading.id)}
                  onAddMaterial={() => addMaterial(activeHeading.id)}
                  onUploadImage={() => {
                    setUploadingTarget({
                      id: activeHeading.id,
                      kind: "heading-image",
                    });
                    fileInputRef.current?.click();
                  }}
                />

                <div className="space-y-4">
                  {activeMaterials.map((item) => (
                    <HrMaterialCard
                      key={item.id}
                      item={item}
                      forms={activeForms}
                      loadingForms={loadingForms}
                      uploading={
                        uploadingTarget?.id === item.id &&
                        uploadingTarget.kind === "pdf"
                      }
                      uploadingImage={
                        uploadingTarget?.id === item.id &&
                        uploadingTarget.kind === "material-image"
                      }
                      onUpdate={(patch) =>
                        updateMaterial(activeHeading.id, item.id, patch)
                      }
                      onUpload={() => {
                        setUploadingTarget({ id: item.id, kind: "pdf" });
                        fileInputRef.current?.click();
                      }}
                      onUploadImage={() => {
                        setUploadingTarget({
                          id: item.id,
                          kind: "material-image",
                        });
                        fileInputRef.current?.click();
                      }}
                      onRemove={() => removeMaterial(activeHeading.id, item.id)}
                      onSelectForm={(formSlug) =>
                        selectForm(activeHeading.id, item.id, formSlug)
                      }
                    />
                  ))}
                </div>

                {activeMaterials.length === 0 && (
                  <HrEmptyMaterialsState
                    onAddMaterial={() => addMaterial(activeHeading.id)}
                  />
                )}
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
