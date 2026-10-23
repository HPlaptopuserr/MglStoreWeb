"use client";
import { ClubDirectoryFilters } from "./ClubDirectoryFilters";
import { useState } from "react";
import Link from "next/link";
import { UsersRound, ArrowDown, Zap, ArrowUpRight } from "lucide-react";
import { type MglClubMember } from "@mgl/types";
import { useClubDirectory } from "./useClubDirectory";
import { ProvinceFilter } from "./ProvinceFilter";
import { MemberGrid } from "./MemberGrid";
import { MemberDialog } from "./MemberDialog";
import { ClubNeedsHub } from "./ClubNeedsHub";
import type { ClubSummary } from "./club-summary";
import styles from "./club-design.module.css";
export function ClubDirectory({ summary }: { summary: ClubSummary }) {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("");
  const [city, setCity] = useState("");
  const [scope, setScope] = useState("services");
  const [visibleCount, setVisibleCount] = useState(6);
  const [selected, setSelected] = useState<MglClubMember | null>(null);
  const directory = useClubDirectory(query, sector, city, scope);
  const availableCount = directory.services.reduce(
    (total, group) =>
      total + (!sector || group.sector === sector ? group.count : 0),
    0,
  );
  const resultCount = query.trim()
    ? `${directory.members.length}${directory.cursor ? "+" : ""}`
    : String(availableCount);
  function reset() {
    setQuery("");
    setSector("");
    setCity("");
    setScope("services");
    setVisibleCount(6);
  }
  function changeQuery(value: string) {
    setQuery(value);
    setVisibleCount(6);
  }
  return (
    <>
      <section
        id="club-directory"
        className={styles.directory}
        aria-labelledby="directory-title"
      >
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>КЛУБИЙН ГИШҮҮД</p>
            <h2 id="directory-title">Танай аймагт хэн, юу хийдэг вэ?</h2>
            <p>
              Орон нутгийн болон нийслэлийн бизнесүүдтэй шууд холбогдож, саналаа
              солилцоорой.
            </p>
          </div>
          <span className={styles.totalBadge}>
            Нийт үйлчилгээ үзүүлэгч: <b>{summary.total ?? "—"}</b>
          </span>
        </div>
        <ProvinceFilter
          value={city}
          onChange={(value) => {
            setCity(value);
            setQuery("");
            setSector("");
            setVisibleCount(6);
          }}
        />
        <ClubDirectoryFilters
          city={city}
          query={query}
          sector={sector}
          scope={scope}
          services={directory.services}
          onQueryChange={changeQuery}
          onSectorChange={(value) => {
            setSector(value);
            setVisibleCount(6);
          }}
          onScopeChange={(value) => {
            setScope(value);
            setVisibleCount(6);
          }}
        />
        <div className={styles.mobileMetrics}>
          <div>
            <strong>{summary.total ?? "—"}</strong>
            <span>Бүртгэлтэй гишүүн</span>
          </div>
          <div>
            <strong>21</strong>
            <span>Аймаг, бүс нутаг</span>
          </div>
          <div>
            <strong>{summary.sectors ?? "—"}</strong>
            <span>Үйл ажиллагааны чиглэл</span>
          </div>
        </div>
        <div className={styles.quickSearch}>
          <span>Түгээмэл:</span>
          {["Хүнс", "Тээвэр", "Оёдол", "Вэб", "Кейтеринг"].map((value) => (
            <button key={value} onClick={() => changeQuery(value)}>
              #{value}
            </button>
          ))}
        </div>
        <a className={styles.mobileTicker} href="#needs-hub">
          <span>
            <Zap size={18} />
          </span>
          <div>
            <b>ХУДАЛДАН АВАХ ХЭРЭГЦЭЭ</b>
            <p>Гишүүдийн хайж буй хамтрагч, үйлчилгээг харах</p>
          </div>
          <ArrowUpRight size={18} />
        </a>
        <div className={styles.resultLine}>
          <p role="status">
            {directory.loading
              ? "Мэдээлэл ачаалж байна…"
              : `${resultCount} үйлчилгээ үзүүлэгч`}
          </p>
          {query || sector || city ? (
            <button onClick={reset}>Шүүлтүүр цэвэрлэх</button>
          ) : (
            <span>Эрэмбэ: Аймгийн дарааллаар</span>
          )}
        </div>
        {directory.error && (
          <div role="alert" className={styles.notice}>
            {directory.error}
            <button onClick={directory.retry}>Дахин оролдох</button>
          </div>
        )}
        <div className={styles.members} aria-busy={directory.loading}>
          <MemberGrid
            members={directory.members.slice(0, visibleCount)}
            onOpen={setSelected}
          />
          {directory.loading && (
            <div className={styles.grid}>
              {[0, 1, 2].map((id) => (
                <div key={id} aria-hidden="true" className={styles.skeleton} />
              ))}
            </div>
          )}
        </div>
        {!directory.loading &&
          !directory.error &&
          !directory.members.length && (
            <div className={styles.empty}>
              <UsersRound size={36} />
              <h3>Тохирох үйлчилгээ үзүүлэгч олдсонгүй</h3>
              <p>Хайлтын үгээ өөрчлөх эсвэл өөр аймаг, чиглэл сонгоорой.</p>
              <button className={styles.secondary} onClick={reset}>
                Бүх гишүүдийг харах
              </button>
              <Link className={styles.primary} href="/mgl-club/join">
                Бизнесээ бүртгүүлэх ↗
              </Link>
            </div>
          )}
        {(directory.cursor || visibleCount < directory.members.length) && (
          <button
            className={styles.loadMore}
            disabled={directory.loading}
            onClick={() => {
              setVisibleCount((value) => value + 6);
              if (visibleCount >= directory.members.length)
                directory.loadMore();
            }}
          >
            {directory.loading ? "Ачаалж байна…" : "Цааш үзэх"}
            <ArrowDown size={16} />
          </button>
        )}
        <p className={styles.directoryNote}>
          Мэдээллийг гишүүд өөрсдөө оруулсан. Үнэ, нөхцөл, худалдан авалтаа
          тухайн бизнестэй шууд тохиролцоно.
        </p>
      </section>
      <ClubNeedsHub />
      {selected && (
        <MemberDialog member={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
