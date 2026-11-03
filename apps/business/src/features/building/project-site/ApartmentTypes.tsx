import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { money } from "../sales/demo-inventory";
import { PlanFurniture } from "../viewer/PlanFurniture";
export function ApartmentTypes() {
  return (
    <section id="layouts" className="residence-section residence-layouts">
      <div className="residence-section-heading">
        <div>
          <p className="residence-eyebrow">02 — ОРОН СУУЦНЫ ТӨЛӨВЛӨЛТ</p>
          <h2>
            Танд тохирох <em>дөрвөн сонголт.</em>
          </h2>
        </div>
        <p>
          Өрөө бүр өөр хэрэгцээнд.
          <br />
          План дээрээс дэлгэрэнгүй үзээрэй.
        </p>
      </div>
      <div className="residence-types">
        {[33, 44, 70, 90].map((area, index) => (
          <Link
            key={area}
            href={`/building/demo?floor=4&unit=apt-4-${index + 1}`}
            className="residence-type"
          >
            <div className="residence-type-image">
              <span>TYPE 0{index + 1}</span>
              <svg
                viewBox="0 0 250 215"
                role="img"
                aria-label={`${index + 1} өрөө байрны жишээ дүрслэл`}
              >
                <rect
                  x="3"
                  y="3"
                  width="240"
                  height="205"
                  fill="#d4c8b1"
                  stroke="#eee7d9"
                  strokeWidth="5"
                />
                <PlanFurniture rooms={index + 1} />
              </svg>
              <small>Жишээ план</small>
            </div>
            <div className="residence-type-heading">
              <h3>{index + 1} өрөө байр</h3>
              <ArrowUpRight size={18} />
            </div>
            <div className="residence-type-area">
              <strong>{area}</strong>
              <span>м²</span>
            </div>
            <div className="residence-type-bottom">
              <span>Жишээ үнэ</span>
              <strong>{money(area * 4_500_000)}</strong>
            </div>
          </Link>
        ))}
      </div>
      <p className="residence-disclaimer">
        План, үнэ нь жишээ. Бодит хэмжээ, баталгаажсан зураг болон төлбөрийн
        нөхцөл биш.
      </p>
    </section>
  );
}
