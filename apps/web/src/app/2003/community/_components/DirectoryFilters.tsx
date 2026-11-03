import {
  Search,
  UsersRound,
  BriefcaseBusiness,
  Store,
  Rocket,
} from "lucide-react";
import { ACTIVITY_TYPES, type Member } from "../model";
import { useCommunityFilters } from "@/features/community-2003/CommunityWorkspace";
import styles from "../community.module.css";
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
export function DirectoryFilters({ members }: { members: Member[] }) {
  const { filters, setFilters } = useCommunityFilters();
  const { tab, query, city, sector } = filters;
  const setQuery = (query: string) =>
    setFilters((previous) => ({ ...previous, query }));
  const setCity = (city: string) =>
    setFilters((previous) => ({ ...previous, city }));
  const setSector = (sector: string) =>
    setFilters((previous) => ({ ...previous, sector }));
  const cities = [...new Set(members.map((member) => member.city))].sort();
  const sectors = [
    ...new Set(
      members
        .filter((member) => tab === "all" || member.activity === tab)
        .map((member) => member.sector),
    ),
  ].sort();
  const directionLabel =
    tab === "all" ? "Үйл ажиллагааны чиглэл" : ACTIVITY_TYPES[tab].direction;
  return (
    <>
      {" "}
      <nav id="directory" className={styles.tabs} aria-label="Мэдээллийн төрөл">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            aria-pressed={tab === id}
            className={tab === id ? styles.activeTab : ""}
            onClick={() => {
              setFilters((previous) => ({
                ...previous,
                tab: id,
                query: "",
                sector: "",
              }));
            }}
          >
            <Icon size={18} />
            {label}{" "}
            <span className={styles.tabCount}>
              {id === "all"
                ? members.length
                : members.filter((member) => member.activity === id).length}
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
    </>
  );
}
