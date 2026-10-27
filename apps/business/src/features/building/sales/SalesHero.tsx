import { Building2 } from "lucide-react";
export function SalesHero() {
  return (
    <section className="sales-hero">
      <div>
        <p className="sales-eyebrow">
          ХОЛИМОГ ЗОРИУЛАЛТТАЙ БАРИЛГА <span>ЖИШЭЭ ТӨСӨЛ</span>
        </p>
        <h1>
          Өргөө <span>16</span>
        </h1>
        <p>
          Амьдрах, бизнес эрхлэх орон зайгаа
          <br />
          нэг дороос сонгоорой.
        </p>
        <div className="sales-hero-tags">
          <span>16 давхар</span>
          <span>52 орон сууц</span>
          <span>B1 + B2 гарааш</span>
        </div>
      </div>
      <div className="sales-hero-summary">
        <Building2 size={40} strokeWidth={1} />
        <strong>
          Нэг барилга.
          <br />
          Дөрвөн боломж.
        </strong>
        <p>Орон сууц · Үйлчилгээ · Гарааш · Зогсоол</p>
      </div>
    </section>
  );
}
