"use client";
import { useState } from "react";
import { BlockCopyPicker } from "./BlockCopyPicker";
import { BlockBasicsEditor } from "./BlockBasicsEditor";
import { BlockEditor } from "./BlockEditor";
import { BuildingDialog } from "./BuildingDialog";
import { inventoryError, newType, type BlockDraft } from "./inventory-draft";
export type { BlockDraft } from "./inventory-draft";
export function ProjectBlocks({
  blocks,
  onChange,
  existing = [],
}: {
  blocks: BlockDraft[];
  onChange: (blocks: BlockDraft[]) => void;
  existing?: BlockDraft[];
}) {
  const [editing, setEditing] = useState<BlockDraft | null>(null);
  const [error, setError] = useState("");
  function close() {
    if (
      editing &&
      !window.confirm("Блок дээр хийж буй өөрчлөлтөө хэрэглэхгүй хаах уу?")
    )
      return;
    setEditing(null);
    setError("");
  }
  function apply(value = editing) {
    if (!value) return;
    const next = blocks.some((b) => b.id === value.id)
      ? blocks.map((b) => (b.id === value.id ? value : b))
      : [...blocks, value];
    const message = inventoryError(next, existing);
    if (message) {
      setError(message);
      return;
    }
    onChange(next);
    setEditing(null);
    setError("");
  }
  return (
    <section className="project-form-section">
      <header>
        <div>
          <h2>Блокуудаа нэмнэ үү</h2>
          <p>
            Блок гэдэг нь төслийн нэг барилга юм. Нэг барилгатай бол нэг блок
            нэмнэ. Нэр, давхрын тоо болон фасадын зургаа оруулна.
          </p>
        </div>
      </header>
      <div className="project-form-fields">
        {!blocks.length && (
          <div className="project-block-empty">
            <h3>Эхний блокоо нэмье</h3>
            <p>Жишээ: А блок → 12 давхар. Байрны мэдээллээ дараа нь нэмнэ.</p>
          </div>
        )}
        {blocks.map((block) => (
          <article key={block.id} className="inventory-card">
            <div>
              <h3>{block.name}</h3>
              <p>
                {block.floors.length} давхар ·{" "}
                {block.floors.reduce((sum, f) => sum + f.units.length, 0)} байр
              </p>
            </div>
            <button
              type="button"
              className="building-secondary"
              onClick={() => {
                setEditing(structuredClone(block));
                setError("");
              }}
            >
              Байр нэмэх / засах
            </button>
            <button
              type="button"
              className="building-secondary"
              onClick={() => {
                if (
                  window.confirm(
                    `${block.name} блокийг энэ бүртгэлээс хасах уу?`,
                  )
                )
                  onChange(blocks.filter((b) => b.id !== block.id));
              }}
            >
              Хасах
            </button>
          </article>
        ))}
        <button
          type="button"
          className="building-primary"
          disabled={blocks.length >= 20}
          onClick={() => {
            setError("");
            setEditing({
              id: crypto.randomUUID(),
              name: "",
              floorCount: "",
              types: [newType()],
              floors: [],
            });
          }}
        >
          + Блок нэмэх
        </button>
        {editing && (
          <BuildingDialog
            title={
              blocks.some((b) => b.id === editing.id)
                ? "Блок тохируулах"
                : "Блок нэмэх"
            }
            subtitle="Блокийн мэдээлэл"
            onClose={close}
            footer={
              <>
                <button
                  type="button"
                  className="building-secondary"
                  onClick={close}
                >
                  Болих
                </button>
              </>
            }
          >
            {!blocks.some((b) => b.id === editing.id) && (
              <BlockCopyPicker
                blocks={blocks}
                onCopy={(value) => {
                  setEditing(value);
                  setError("");
                }}
              />
            )}
            {!blocks.some((b) => b.id === editing.id) ? (
              <BlockBasicsEditor
                key={editing.id}
                block={editing}
                onChange={setEditing}
                onComplete={apply}
              />
            ) : (
              <BlockEditor
                block={editing}
                index={blocks.length}
                onChange={setEditing}
                onComplete={apply}
              />
            )}
            {error && (
              <p role="alert" className="building-error-message wizard-error">
                {error}
              </p>
            )}
          </BuildingDialog>
        )}
      </div>
    </section>
  );
}
