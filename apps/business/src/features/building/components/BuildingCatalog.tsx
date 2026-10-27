"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  ArrowRight,
  Building2,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import type { BuildingProjectSummary } from "@mgl/types";
import { ProjectCard } from "./ProjectCard";
import { BuildingIllustration } from "./BuildingIllustration";
export function BuildingCatalog({
  projects,
}: {
  projects: BuildingProjectSummary[];
}) {
  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState("");
  const districts = useMemo(
    () =>
      [
        ...new Set(
          projects
            .map((p) => p.district)
            .filter((v): v is string => Boolean(v)),
        ),
      ].sort(),
    [projects],
  );
  const visible = useMemo(
    () =>
      projects.filter(
        (p) =>
          (!district || p.district === district) &&
          `${p.title} ${p.organization.name} ${p.address ?? ""}`
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
      ),
    [projects, search, district],
  );
  return (
    <main className="building-public">
      <section className="building-hero-new">
        <div>
          <p className="building-eyebrow">
            <span /> MGL BUSINESS / REAL ESTATE
          </p>
          <h1>
            Амьдралын шинэ
            <br />
            орон зайгаа <em>олоорой.</em>
          </h1>
          <p className="building-hero-copy">
            Баталгаажсан барилгын төслүүдийг нэг дороос.
            <br />
            Байршил, төлөвлөлт, үнэ — сонголт бүр илүү ойлгомжтой.
          </p>
          <a href="#projects" className="building-primary">
            Төслүүдтэй танилцах <ArrowRight size={18} />
          </a>
          <Link
            href="/building/demo"
            className="building-secondary"
            style={{ marginLeft: 8 }}
          >
            16 давхар жишээ үзэх
          </Link>
          <div className="building-trust">
            <ShieldCheck size={17} /> Баталгаажсан мэдээлэл <span /> Шууд
            байгууллагаас
          </div>
        </div>
        <BuildingIllustration />
      </section>
      <section id="projects" className="building-catalog-section">
        <div className="section-heading">
          <div>
            <p className="building-eyebrow">ТАНЫ ДАРААГИЙН СОНГОЛТ</p>
            <h2>
              Барилгын төслүүд <span>{projects.length}</span>
            </h2>
          </div>
          <p>Өөрт тохирох байршлаас эхлээрэй.</p>
        </div>
        <div className="building-filterbar">
          <label className="search-field">
            <Search size={19} />
            <span className="sr-only">Төсөл хайх</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Төсөл, байгууллага, хаягаар хайх…"
            />
          </label>
          <label className="district-field">
            <MapPin size={18} />
            <span className="sr-only">Байршлаар шүүх</span>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            >
              <option value="">Бүх байршил</option>
              {districts.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
          <span className="filter-result">
            <SlidersHorizontal size={16} />
            {visible.length} төсөл
          </span>
        </div>
        {visible.length ? (
          <div className="building-project-grid">
            {visible.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        ) : (
          <div className="building-empty">
            <span className="empty-icon">
              <Building2 size={30} />
            </span>
            <p className="building-eyebrow">
              {projects.length ? "ХАЙЛТЫН ҮР ДҮН" : "ШИНЭ БОЛОМЖУУД УДАХГҮЙ"}
            </p>
            <h3>
              {projects.length
                ? "Тохирох төсөл олдсонгүй"
                : "Таны дараагийн орон зай эндээс эхэлнэ."}
            </h3>
            <p>
              {projects.length
                ? "Хайлтын үг эсвэл байршлаа өөрчлөөд үзээрэй."
                : "Баталгаажсан төслүүд нийтлэгдэхэд энд харагдана.\nТа барилгын байгууллага төлөөлж байгаа бол төслөө бүртгээрэй."}
            </p>
            {projects.length ? (
              <button
                className="building-secondary"
                onClick={() => {
                  setSearch("");
                  setDistrict("");
                }}
              >
                Шүүлтүүр цэвэрлэх
              </button>
            ) : (
              <Link className="building-secondary" href="/building/manage/new">
                Төсөл бүртгэх <ArrowRight size={16} />
              </Link>
            )}
          </div>
        )}
      </section>
      <section className="building-partner-strip">
        <div>
          <p className="building-eyebrow">БАЙГУУЛЛАГАД ЗОРИУЛАВ</p>
          <h2>Төслөө илүү ойр хүргэе.</h2>
          <p>Төслийн мэдээллээ нэг орчноос бүртгэж, удирдаарай.</p>
        </div>
        <Link href="/building/manage" className="building-primary">
          Удирдлага руу орох <ArrowRight size={18} />
        </Link>
      </section>
    </main>
  );
}
