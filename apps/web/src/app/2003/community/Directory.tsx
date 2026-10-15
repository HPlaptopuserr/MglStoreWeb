"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Search,
  UsersRound,
  BriefcaseBusiness,
  Store,
  Rocket,
} from "lucide-react";
import {
  ACTIVITY_TYPES,
  matchesMember,
  type DirectoryTab,
  type Member,
} from "./model";
import { useDemoDirectory } from "./useDemoDirectory";
import { MemberCard } from "./_components/MemberCard";
import { MemberDialog } from "./_components/MemberDialog";
import styles from "./community.module.css";
const tabs = [
  { id: "all", label: "Бүгд", icon: UsersRound },
  {
    id: "employed",
    label: ACTIVITY_TYPES.employed.label,
    icon: BriefcaseBusiness,
  },
  { id: "business", label: ACTIVITY_TYPES.business.label, icon: Store },
  { id: "planning", label: ACTIVITY_TYPES.planning.label, icon: Rocket },
] as const;
export function Directory() {
  const { data, ready, error, reset } = useDemoDirectory();
  const [tab, setTab] = useState<DirectoryTab>("all");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [sector, setSector] = useState("");
  const [selected, setSelected] = useState<Member | null>(null);
  const categoryMembers = data.members.filter(
    (member) => tab === "all" || member.activity === tab,
  );
  const members = categoryMembers.filter((member) =>
    matchesMember(member, query, city, sector),
  );
  const cities = [...new Set(data.members.map((member) => member.city))].sort();
  const sectors = [
    ...new Set(categoryMembers.map((member) => member.sector)),
  ].sort();
  const count = members.length;
  const directionLabel =
    tab === "all" ? "Үйл ажиллагааны чиглэл" : ACTIVITY_TYPES[tab].direction;
  function clear() {
    setQuery("");
    setCity("");
    setSector("");
  }
  return (
    <div className={styles.page}>
      <div className={styles.demoBanner}>
        LOCAL DEMO · Бүх нэр, байгууллага, хүсэлт зохиомол. Бодит бүртгэлээс
        тусдаа.
      </div>
      <header className={styles.header}>
        <Link href="/2003" className={styles.logo}>
          2003<span>Бидний хүрээлэл</span>
        </Link>
        <Link href="/2003/join" className={styles.primary}>
          Нэгдэх <ArrowUpRight size={17} />
        </Link>
      </header>
      <div className={styles.main}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>ХОЛБООТОЙ БАЙХЫН ЭХЛЭЛ</p>
            <h1>
              Хэн юу хийж байна?
              <br />
              <span>Хамтдаа илүү ихийг.</span>
            </h1>
            <p>
              Мэргэжил, туршлага, боломжоо хуваалцъя.
              <br />
              Хэрэгтэй хүнээ олж, нэгэндээ туслах дараагийн алхмаа эхлүүлээрэй.
            </p>
          </div>
          <aside className={styles.stats}>
            <div>
              <strong>{data.members.length}</strong>
              <span>танилцуулга</span>
            </div>
            <div>
              <strong>{cities.length}</strong>
              <span>хот</span>
            </div>
            <div>
              <strong>
                {new Set(data.members.map((member) => member.sector)).size}
              </strong>
              <span>үйл ажиллагааны чиглэл</span>
            </div>
            <p>Жишээ өгөгдөл · Хамтын боломжийг туршъя ↗</p>
          </aside>
        </section>
        <nav className={styles.tabs} aria-label="Мэдээллийн төрөл">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              aria-pressed={tab === id}
              className={tab === id ? styles.activeTab : ""}
              onClick={() => {
                setTab(id);
                setQuery("");
                setSector("");
              }}
            >
              <Icon size={18} />
              {label}{" "}
              <span className={styles.tabCount}>
                {id === "all"
                  ? data.members.length
                  : data.members.filter((member) => member.activity === id)
                      .length}
              </span>
            </button>
          ))}
        </nav>
        <div className={styles.categoryIntro}>
          <h2>
            {tab === "all"
              ? "Бүх гишүүний үйл ажиллагаа"
              : ACTIVITY_TYPES[tab].label}
          </h2>
          <p>
            {tab === "planning"
              ? "Эхлүүлэх бизнесийн санаа, чиглэл болон хэрэгтэй дэмжлэг."
              : tab === "business"
                ? "Бизнес, бүтээгдэхүүн, үйлчилгээний чиглэлээр танилцаарай."
                : tab === "employed"
                  ? "Ажлын чиглэл, байгууллага, албан тушаалаар хайж олоорой."
                  : "Ажлын болон бизнесийн төлөвөө сонгоод чиглэлээр нь шүүж хараарай."}
          </p>
        </div>
        <section className={styles.toolbar} aria-label="Хайлт ба шүүлтүүр">
          <label className={styles.search}>
            <Search size={19} />
            <span className={styles.srOnly}>Хайх</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Нэр, байгууллага, үйл ажиллагааны чиглэл…"
            />
          </label>
          <label>
            <span className={styles.srOnly}>Байршил</span>
            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
            >
              <option value="">Бүх байршил</option>
              {cities.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={styles.srOnly}>{directionLabel}</span>
            <select
              value={sector}
              onChange={(event) => setSector(event.target.value)}
            >
              <option value="">{directionLabel}: Бүгд</option>
              {sectors.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </section>
        {error && (
          <p role="alert" className={styles.notice}>
            {error}
          </p>
        )}
        <div className={styles.results}>
          <p role="status">
            {ready ? `${count} хүн олдлоо` : "Жагсаалтыг ачаалж байна…"}
          </p>
          <button onClick={clear}>Шүүлтүүр цэвэрлэх</button>
        </div>
        {!ready ? (
          <div className={styles.empty}>Туршилтын мэдээллийг бэлдэж байна…</div>
        ) : count === 0 ? (
          <div className={styles.empty}>
            <Search size={30} />
            <h2>Тохирох мэдээлэл олдсонгүй</h2>
            <p>Өөр үгээр хайх эсвэл шүүлтүүрээ цэвэрлээрэй.</p>
            <button className={styles.primary} onClick={clear}>
              Бүгдийг харах
            </button>
          </div>
        ) : (
          <div className={styles.sectorGroups}>
            {[...new Set(members.map((member) => member.sector))]
              .sort()
              .map((direction) => (
                <section key={direction} aria-label={direction}>
                  <h2 className={styles.sectorHeading}>
                    {direction}
                    <span>
                      {
                        members.filter((member) => member.sector === direction)
                          .length
                      }{" "}
                      хүн
                    </span>
                  </h2>
                  <div className={styles.grid}>
                    {members
                      .filter((member) => member.sector === direction)
                      .map((member) => (
                        <MemberCard
                          key={member.id}
                          member={member}
                          onOpen={setSelected}
                        />
                      ))}
                  </div>
                </section>
              ))}
          </div>
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
        </footer>
      </div>
      {selected && (
        <MemberDialog member={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
