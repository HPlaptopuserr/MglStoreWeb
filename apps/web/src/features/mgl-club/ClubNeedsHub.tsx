"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  Handshake,
  Plus,
  SearchX,
} from "lucide-react";
import type { MglClubMember } from "@mgl/types";
import { useClubDirectory } from "./useClubDirectory";
import { MemberDialog, type MemberView } from "./MemberDialog";
import { NeedCard } from "./NeedCard";
import { NeedsFilters } from "./NeedsFilters";
import styles from "./needs.module.css";
export function ClubNeedsHub() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [sector, setSector] = useState("");
  const [visible, setVisible] = useState(6);
  const [selected, setSelected] = useState<{
    member: MglClubMember;
    view: MemberView;
  } | null>(null);
  const directory = useClubDirectory(query, sector, city, "needs");
  const total = directory.services.reduce(
    (sum, group) =>
      sum + (!sector || group.sector === sector ? group.count : 0),
    0,
  );
  const count = query.trim()
    ? `${directory.members.length}${directory.cursor ? "+" : ""}`
    : String(total);
  function reset() {
    setQuery("");
    setCity("");
    setSector("");
    setVisible(6);
  }
  function open(member: MglClubMember, view: MemberView) {
    setSelected({ member, view });
  }
  const more = visible < directory.members.length || Boolean(directory.cursor);
  return (
    <section
      id="needs-hub"
      className={styles.section}
      aria-labelledby="needs-heading"
    >
      <div className={styles.container}>
        <header className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>
              <Handshake size={15} />
              ХАМТЫН АЖИЛЛАГААНЫ БОЛОМЖ
            </p>
            <h2 id="needs-heading">Таны үйлчилгээ хэнд хэрэгтэй вэ?</h2>
            <p>
              Гишүүдийн худалдан авах хэрэгцээг олж, бүтээгдэхүүн үйлчилгээгээ
              шууд санал болгоорой.
            </p>
          </div>
          <Link className={styles.register} href="/mgl-club/join">
            <Plus size={16} />
            Хэрэгцээгээ бүртгүүлэх
            <ArrowUpRight size={15} />
          </Link>
        </header>
        <div className={styles.guide}>
          <span>
            <b>01</b>Хэрэгцээг ол
          </span>
          <i />
          <span>
            <b>02</b>Бизнесийг нь тань
          </span>
          <i />
          <span>
            <b>03</b>Саналаа шууд тохиролц
          </span>
        </div>
        <NeedsFilters
          query={query}
          city={city}
          sector={sector}
          onQuery={(value) => {
            setQuery(value);
            setVisible(6);
          }}
          onCity={(value) => {
            setCity(value);
            setVisible(6);
          }}
          onSector={(value) => {
            setSector(value);
            setVisible(6);
          }}
        />
        <div className={styles.result}>
          <p role="status">
            {directory.loading ? (
              "Хэрэгцээг ачаалж байна…"
            ) : directory.error ? (
              "Мэдээлэл ачаалагдсангүй"
            ) : (
              <>
                <strong>{count}</strong> хэрэгцээ
                {city ? ` · ${city}` : " · Бүх байршил"}
              </>
            )}
          </p>
          {(query || city || sector) && (
            <button onClick={reset}>Шүүлтүүр цэвэрлэх</button>
          )}
        </div>
        {directory.error && (
          <div role="alert" className={styles.error}>
            <p>
              Хэрэгцээг ачаалж чадсангүй. Холболтоо шалгаад дахин оролдоно уу.
            </p>
            <button onClick={directory.retry}>Дахин оролдох</button>
          </div>
        )}
        <div aria-busy={directory.loading} className={styles.grid}>
          {directory.members.slice(0, visible).map((member) => (
            <NeedCard key={member.id} member={member} onOpen={open} />
          ))}
          {directory.loading &&
            [0, 1, 2].map((id) => (
              <div key={id} className={styles.skeleton} aria-hidden="true" />
            ))}
        </div>
        {!directory.loading &&
          !directory.error &&
          !directory.members.length && (
            <div className={styles.empty}>
              <SearchX size={30} />
              <h3>
                {query || city || sector
                  ? "Тохирох хэрэгцээ олдсонгүй"
                  : "Гишүүдийн хэрэгцээ энд харагдана"}
              </h3>
              <p>
                {query || city || sector
                  ? "Өөр түлхүүр үг, байршил эсвэл захиалагчийн салбар сонгоорой."
                  : "Бизнесээ бүртгүүлэхдээ ямар бүтээгдэхүүн, үйлчилгээ хайж байгаагаа бичээрэй."}
              </p>
              {query || city || sector ? (
                <button onClick={reset}>Бүх хэрэгцээг харах</button>
              ) : (
                <Link href="/mgl-club/join">Хэрэгцээгээ бүртгүүлэх</Link>
              )}
            </div>
          )}
        {more && !directory.error && (
          <button
            className={styles.more}
            disabled={directory.loading}
            onClick={() => {
              setVisible((value) => value + 6);
              if (visible >= directory.members.length) directory.loadMore();
            }}
          >
            {directory.loading ? "Ачаалж байна…" : "Дараагийн хэрэгцээг харах"}
            <ArrowDown size={16} />
          </button>
        )}
        <p className={styles.note}>
          Үнийн санал, нийлүүлэлтийн нөхцөлийг тухайн бизнестэй шууд
          тохиролцоно. Туршилтын мэдээлэл тусгай тэмдэглэгээтэй.
        </p>
      </div>
      {selected && (
        <MemberDialog
          key={`${selected.member.id}:${selected.view}`}
          member={selected.member}
          initialView={selected.view}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
