"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { matchesMember, type Member } from "./model";
import { useCommunityFilters } from "@/features/community-2003/CommunityWorkspace";
import { useDemoDirectory } from "./useDemoDirectory";
import { DirectoryHero } from "./_components/DirectoryHero";
import { DirectoryFilters } from "./_components/DirectoryFilters";
import { DirectoryResults } from "./_components/DirectoryResults";
import { MemberDialog } from "./_components/MemberDialog";
import styles from "./community.module.css";
export function Directory({ demo = true }: { demo?: boolean }) {
  const { data, ready, error, reset, retry } = useDemoDirectory(demo);
  const { filters, setFilters } = useCommunityFilters();
  const { tab, query, city, sector } = filters;
  const [selected, setSelected] = useState<Member | null>(null);
  const categoryMembers = data.members.filter(
    (member) => tab === "all" || member.activity === tab,
  );
  const members = categoryMembers.filter((member) =>
    matchesMember(member, query, city, sector),
  );
  const cities = [...new Set(data.members.map((member) => member.city))].sort();
  function clear() {
    setFilters((previous) => ({
      ...previous,
      query: "",
      city: "",
      sector: "",
    }));
  }
  return (
    <div className={styles.page}>
      {demo && (
        <div className={styles.demoBanner}>
          LOCAL DEMO · Бүх нэр, байгууллага, хүсэлт зохиомол. Бодит бүртгэлээс
          тусдаа.
        </div>
      )}
      <div className={styles.main}>
        <DirectoryHero
          members={data.members.length}
          cities={cities.length}
          sectors={new Set(data.members.map((member) => member.sector)).size}
          demo={demo}
        />
        <DirectoryFilters members={data.members} />
        {error && (
          <p role="alert" className={styles.notice}>
            {error}
            {!demo && <button onClick={retry}>Дахин оролдох</button>}
          </p>
        )}
        {(!error || demo) && (
          <DirectoryResults
            members={members}
            total={data.members.length}
            ready={ready}
            demo={demo}
            onClear={clear}
            onOpen={setSelected}
          />
        )}
        <section className={styles.joinCallout}>
          <div>
            <h2>Таны туршлага хэн нэгэнд хэрэгтэй.</h2>
            <p>Өөрийн тухай, бусдад хэрхэн тусалж чадахаа хуваалцаарай.</p>
          </div>
          <Link className={styles.primary} href="/2003/join">
            Нэгдэх <ArrowUpRight size={17} />
          </Link>
        </section>
        <footer className={styles.footer}>
          <span>2003 · Танилцаанаас хамтын ажиллагаа руу.</span>
          {demo && (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Энэ браузерын туршилтын өөрчлөлтүүдийг арилгаж, анхны жишээг сэргээх үү?",
                  )
                ) {
                  reset();
                  clear();
                }
              }}
            >
              Жишээг эхнээс нь сэргээх
            </button>
          )}
        </footer>
      </div>
      {selected && (
        <MemberDialog
          demo={demo}
          member={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
