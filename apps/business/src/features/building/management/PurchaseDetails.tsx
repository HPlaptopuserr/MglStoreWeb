"use client";
import { useState } from "react";
import type { BuildingInventoryUnit } from "@mgl/types";
const money = (value: string | null) =>
  value && Number(value) > 0
    ? `${Number(value).toLocaleString("mn-MN")} ₮`
    : "Бүртгээгүй";
export function PurchaseDetails({ unit }: { unit: BuildingInventoryUnit }) {
  const [tab, setTab] = useState("unit");
  const block = unit.floor.block,
    project = block.project;
  const rows = [
    ["Блок / давхар", `${block.name} / ${unit.floor.number}-р давхар`],
    [
      "Тоот / байрны төрөл",
      `${unit.unitNo} / ${unit.typeLabel || "Бүртгээгүй"}`,
    ],
    [
      "Өрөө / нийт талбай",
      `${unit.rooms ?? "—"} өрөө / ${unit.areaM2 ?? "—"} м²`,
    ],
    ["Нийт үнэ", money(unit.priceTotal)],
    ["1 м² үнэ", money(unit.pricePerM2)],
    [
      "Байршил",
      [project.district, project.address].filter(Boolean).join(", ") ||
        "Бүртгээгүй",
    ],
    [
      "Ашиглалтад орох хугацаа",
      project.completesAt ? project.completesAt.slice(0, 10) : "Бүртгээгүй",
    ],
    ["План зураг", unit.planImageUrl ? "Бүртгэлтэй" : "Бүртгээгүй"],
  ];
  return (
    <div className="purchase-popup">
      <div
        className="building-tabs purchase-tabs"
        aria-label="Байрны мэдээллийн хэсэг"
      >
        {[
          ["unit", "Байрны мэдээлэл"],
          ["payment", "Үнэ, төлбөр"],
          ["buyer", "Худалдан авагч"],
        ].map(([key, label]) => (
          <button
            type="button"
            key={key}
            aria-pressed={tab === key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="purchase-details">
        <div hidden={tab !== "unit"}>
          <h4>Худалдан авагчид өгөх байрны мэдээлэл</h4>
          <dl>
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div hidden={tab !== "payment"}>
          <h4>Үнэ, төлбөрийн нөхцөл</h4>
          {block.paymentTiers.length ? (
            <ul>
              {block.paymentTiers.map((tier) => (
                <li key={tier.id}>
                  {tier.label || "Төлбөрийн хувилбар"}: {tier.minPercent}–
                  {tier.maxPercent}% төлөлт · {money(tier.pricePerM2)} / м²
                </li>
              ))}
            </ul>
          ) : (
            <p>
              Баталгаажуулсан үнийн хувилбар, урьдчилгаа болон төлөлтийн хуваарь
              бүртгээгүй.
            </p>
          )}
        </div>
        <div hidden={tab !== "buyer"}>
          <h4>Захиалга авахад цуглуулах мэдээлэл</h4>
          <ul>
            <li>Сонгосон блок, давхар, тоот</li>
            <li>Худалдан авагчийн нэр, холбоо барих утас</li>
            <li>Тохиролцсон нийт үнэ, сонгосон төлбөрийн хувилбар</li>
            <li>Урьдчилгааны дүн, төлөх хугацаа, үлдэгдлийн хуваарь</li>
            <li>Гэрээний нөхцөл, захиалгын хүчинтэй хугацаа</li>
          </ul>
          <p className="management-footnote">
            Энэ нь мэдээллийн жагсаалт. Захиалга, гэрээ, төлбөр хүлээн авах
            үйлдэл хараахан холбогдоогүй.
          </p>
          {unit.status === "AVAILABLE" &&
            (!unit.priceTotal ||
              !unit.published ||
              project.status !== "PUBLISHED" ||
              project.verification !== "VERIFIED") && (
              <p className="building-alert">
                Боломжтой төлөвтэй боловч үнэ болон нийтлэх баталгаажуулалтыг
                шалгаж дуусгаагүй. Худалдаанд бэлэн гэж үзэхгүй.
              </p>
            )}
        </div>
      </div>
    </div>
  );
}
