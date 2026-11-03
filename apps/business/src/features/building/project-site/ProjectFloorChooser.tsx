"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, ChevronDown } from "lucide-react";
import { createDemoInventory, money } from "../sales/demo-inventory";
import { BuildingElevation } from "./BuildingElevation";
const units = createDemoInventory();
export function ProjectFloorChooser() {
  const [floor, setFloor] = useState(14);
  const floorUnits = units.filter((unit) => unit.floor === floor),
    available = floorUnits.filter((unit) => unit.status === "available");
  return (
    <section id="choose-floor" className="residence-choose">
      <div className="residence-section residence-choose-inner">
        <div className="residence-choose-copy">
          <p className="residence-eyebrow">03 — ӨӨРИЙН ОРОН ЗАЙГАА СОНГОХ</p>
          <h2>
            Эхлээд давхраа.
            <br />
            <em>Дараа нь байраа.</em>
          </h2>
          <p>
            Барилга дээрх давхрыг сонгоод тухайн давхрын байр, талбай,
            борлуулалтын төлөвийг хараарай.
          </p>
          <ol className="residence-steps">
            <li className="complete">
              <Check size={12} />A блок
            </li>
            <li className="current">
              <b>2</b>Давхар
            </li>
            <li>
              <b>3</b>Байр
            </li>
          </ol>
          <div className="residence-floor-card">
            <div>
              <span>СОНГОСОН ДАВХАР</span>
              <label>
                <select
                  aria-label="Танилцуулгын давхар"
                  value={floor}
                  onChange={(event) => setFloor(Number(event.target.value))}
                >
                  {Array.from({ length: 16 }, (_, i) => 16 - i).map((value) => (
                    <option value={value} key={value}>
                      {value} давхар
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} />
              </label>
            </div>
            <div className="residence-floor-summary">
              <strong>
                {available.length}
                <small> / {floorUnits.length}</small>
              </strong>
              <p>{floor > 3 ? "байр боломжтой" : "талбай боломжтой"}</p>
            </div>
            <div className="residence-floor-mini">
              {floorUnits.map((unit) => (
                <Link
                  key={unit.id}
                  href={`/building/demo?floor=${floor}&unit=${unit.id}`}
                  className={unit.status}
                  aria-label={`№ ${unit.number}, ${unit.area} м², ${unit.status === "sold" ? "Зарагдсан" : unit.status === "reserved" ? "Захиалгатай" : "Боломжтой"}`}
                >
                  <strong>№ {unit.number}</strong>
                  <span>{unit.area} м²</span>
                  <i />
                </Link>
              ))}
            </div>
            <p className="residence-floor-price">
              {available.length
                ? `${money(Math.min(...available.map((unit) => unit.price)))}-с`
                : "Боломжтой нэгж алга"}
              <span>Жишээ үнэ</span>
            </p>
            <Link
              href={`/building/demo?floor=${floor}`}
              className="residence-button"
            >
              {floor}-р давхрын план үзэх
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <p className="residence-choose-hint">
            Ногоон · боломжтой &nbsp; Шар · захиалгатай &nbsp; Улаан · зарагдсан
          </p>
        </div>
        <div className="residence-choose-visual">
          <span className="residence-block-tag">
            A БЛОК <span>16 ДАВХАР</span>
          </span>
          <BuildingElevation floor={floor} units={units} onSelect={setFloor} />
        </div>
      </div>
    </section>
  );
}
