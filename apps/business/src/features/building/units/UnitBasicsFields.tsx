import type { WebsiteInventoryUnit } from "@mgl/types/building-website";

interface UnitBasicsFieldsProps {
  draft: WebsiteInventoryUnit;
  description: string;
  onDraftChange: (unit: WebsiteInventoryUnit) => void;
  onDescriptionChange: (value: string) => void;
}

export function UnitBasicsFields({
  draft,
  description,
  onDraftChange,
  onDescriptionChange,
}: UnitBasicsFieldsProps) {
  return (
    <section className="unit-editor-section">
      <div className="unit-section-heading">
        <h3>Үндсэн мэдээлэл</h3>
        <p>Байрыг таних нэр, тоот болон хэмжээг оруулна уу.</p>
      </div>
      <div className="unit-basics-grid">
        <label>
          Байрны нэр
          <input
            maxLength={100}
            placeholder="Жишээ: А загвар, 2 өрөө"
            value={draft.typeLabel ?? ""}
            onChange={(event) =>
              onDraftChange({ ...draft, typeLabel: event.target.value })
            }
          />
        </label>
        <label>
          Тоот
          <input
            maxLength={30}
            placeholder="Жишээ: 501"
            value={draft.unitNo}
            onChange={(event) =>
              onDraftChange({ ...draft, unitNo: event.target.value })
            }
          />
        </label>
      </div>
      <div className="unit-basics-grid">
        <label>
          Өрөөний тоо
          <input
            type="number"
            min={1}
            max={20}
            value={draft.rooms ?? ""}
            onChange={(event) =>
              onDraftChange({
                ...draft,
                rooms: event.target.value ? Number(event.target.value) : null,
              })
            }
          />
        </label>
        <label>
          Талбай, м²
          <input
            type="number"
            min={0.01}
            max={10000}
            step={0.01}
            value={draft.areaM2 ?? ""}
            onChange={(event) =>
              onDraftChange({ ...draft, areaM2: event.target.value || null })
            }
          />
        </label>
      </div>
      <label>
        Байрны танилцуулга
        <textarea
          rows={3}
          placeholder="Өрөөний зохион байгуулалт, цонхны чиглэл, онцлог…"
          maxLength={5000}
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
        />
      </label>
      <small className="unit-field-hint">
        Танилцуулга нь хэрэглэгчийн харах байрны дэлгэрэнгүй хэсэгт гарна.
      </small>
    </section>
  );
}
