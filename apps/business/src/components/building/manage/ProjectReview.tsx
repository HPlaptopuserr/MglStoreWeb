import type { ProjectBasicsDraft } from "./ProjectBasics";
import type { BlockDraft } from "./inventory-draft";
export function ProjectReview({
  basics,
  blocks,
  organization,
}: {
  basics?: ProjectBasicsDraft;
  blocks: BlockDraft[];
  organization: string;
}) {
  const units = blocks.flatMap((b) => b.floors.flatMap((f) => f.units));
  return (
    <section className="project-form-section">
      <header>
        <div>
          <h2>Хадгалахаас өмнө шалгана уу</h2>
          <p>Алдаатай зүйл байвал «Буцах» товчоор засаж болно.</p>
        </div>
      </header>
      <div className="project-form-fields">
        <h3>{basics?.title || organization}</h3>
        <p>Байгууллага: {organization}</p>
        {basics && (
          <p>
            Байршил:{" "}
            {[basics.district, basics.address].filter(Boolean).join(", ") ||
              "Дараа нь оруулж болно"}
          </p>
        )}
        <div className="wizard-totals">
          <strong>{blocks.length} блок</strong>
          <strong>{units.length} байр</strong>
          <strong>
            {units
              .reduce((sum, u) => sum + Number(u.areaM2), 0)
              .toLocaleString("mn-MN")}{" "}
            м²
          </strong>
        </div>
        {blocks.map((block) => (
          <details className="project-block" key={block.id}>
            <summary>
              {block.name} · {block.floors.length} давхар ·{" "}
              {block.floors.reduce((sum, f) => sum + f.units.length, 0)} байр
            </summary>
            <div className="project-block-fields">
              {block.floors.map((floor) => (
                <div key={floor.id}>
                  <strong>{floor.number}-р давхар</strong>
                  <ul>
                    {floor.units.map((unit) => (
                      <li key={unit.id}>
                        {unit.unitNo} тоот · {unit.typeLabel} · {unit.rooms}{" "}
                        өрөө · {unit.areaM2} м²
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        ))}
        <p className="project-organization">
          Хадгалсны дараа зөвхөн танай байгууллагын удирдлагад харагдана.
          Худалдан авагчдад автоматаар нийтлэхгүй.
        </p>
      </div>
    </section>
  );
}
