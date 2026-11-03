import type { BuildingOrganization } from "@mgl/types";
export interface ProjectBasicsDraft {
  title: string;
  district: string;
  address: string;
  description: string;
  coverImageUrl: string;
}
export function ProjectBasics({
  value,
  organization,
  onChange,
}: {
  value: ProjectBasicsDraft;
  organization: BuildingOrganization | null;
  onChange: (value: ProjectBasicsDraft) => void;
}) {
  return (
    <section className="project-form-section">
      <header>
        <div>
          <h2>Төслөө танилцуулна уу</h2>
          <p>Эхлээд нэр, байршлаа оруулна. Дараа нь блок, байруудаа нэмнэ.</p>
        </div>
      </header>
      <div className="project-form-fields">
        <div className="project-organization">
          <div>
            <span>Бүртгэх байгууллага</span>
            <strong>{organization?.name || "Ачаалж байна…"}</strong>
          </div>
        </div>
        <label>
          Төслийн нэр *
          <input
            required
            maxLength={180}
            value={value.title}
            placeholder="Жишээ: Нарлаг хотхон"
            onChange={(e) => onChange({ ...value, title: e.target.value })}
          />
        </label>
        <div className="form-two-columns">
          <label>
            Дүүрэг
            <input
              maxLength={120}
              value={value.district}
              placeholder="Жишээ: Хан-Уул"
              onChange={(e) => onChange({ ...value, district: e.target.value })}
            />
          </label>
          <label>
            Хаяг
            <input
              maxLength={500}
              value={value.address}
              placeholder="Хороо, гудамж, байршил"
              onChange={(e) => onChange({ ...value, address: e.target.value })}
            />
          </label>
        </div>
        <label>
          Товч танилцуулга <small>Заавал биш</small>
          <textarea
            rows={3}
            maxLength={5000}
            value={value.description}
            onChange={(e) =>
              onChange({ ...value, description: e.target.value })
            }
          />
        </label>
        <p className="project-organization">
          Зөвхөн төслийн нэр заавал шаардлагатай. Нүүр зураг, давхрын план, үнэ
          болон дэлгэрэнгүй мэдээллийг бүртгэсний дараа нэмнэ.
        </p>
      </div>
    </section>
  );
}
