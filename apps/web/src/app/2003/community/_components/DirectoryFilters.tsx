import {
  Search,
  UsersRound,
  BriefcaseBusiness,
  Store,
  Rocket,
} from "lucide-react";
import {
  COMMUNITY_LOCATIONS,
  UNSPECIFIED_LOCATION,
  communityLocationLabel,
  normalizeCommunityLocation,
  matchesCommunityLocation,
} from "../locations";
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
  const legacyLocations = [
    ...new Set(
      members
        .map((member) => normalizeCommunityLocation(member.city))
        .filter(
          (value) =>
            value &&
            !COMMUNITY_LOCATIONS.some((location) => location === value),
        ),
    ),
  ].sort();
  const locationCount = (location: string) =>
    members.filter(
      (member) =>
        (tab === "all" || member.activity === tab) &&
        matchesCommunityLocation(member.city, location),
    ).length;
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
            placeholder="Тусалж чадах зүйл, мэргэжил, нэр…"
          />
        </label>
        <label>
          <span className={styles.srOnly}>Аймаг / хот</span>
          <select
            value={city}
            onChange={(event) => setCity(event.target.value)}
          >
            <option value="">Бүх аймаг, хот</option>
            {COMMUNITY_LOCATIONS.map((location) => (
              <option key={location} value={location}>
                {communityLocationLabel(location)} ({locationCount(location)})
              </option>
            ))}
            {legacyLocations.length > 0 && (
              <optgroup label="Бусад хот, байршил">
                {legacyLocations.map((location) => (
                  <option key={location} value={location}>
                    {location} ({locationCount(location)})
                  </option>
                ))}
              </optgroup>
            )}
            {members.some((member) => !member.city.trim()) && (
              <option value={UNSPECIFIED_LOCATION}>
                Байршил оруулаагүй ({locationCount(UNSPECIFIED_LOCATION)})
              </option>
            )}
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
