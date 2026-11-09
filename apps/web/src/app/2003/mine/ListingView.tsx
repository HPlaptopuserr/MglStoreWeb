import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  FilePlus2,
  Globe2,
  LockKeyhole,
  MapPin,
  Pencil,
  Plus,
  UserRound,
} from "lucide-react";
import { resolveApiAssetUrl } from "@/lib/api";
import styles from "./listings.module.css";

export interface ListingSummary {
  id: string;
  title: string;
  name: string;
  city?: string;
  profession?: string;
  organization?: string;
  photoUrl?: string;
  published: boolean;
}
type EditAction =
  | { href: string; onEdit?: never }
  | { onEdit: () => void; href?: never };

export function ListingsHeader({
  count,
  description = "Танилцуулгуудаа нэг дороос удирдаарай.",
}: {
  count?: number;
  description?: string;
}) {
  return (
    <header className={styles.heading}>
      <div>
        <p className={styles.eyebrow}>ТАНЫ ХҮРЭЭЛЭЛ</p>
        <h1>
          Миний жагсаалт{" "}
          {count !== undefined && <span className={styles.count}>{count}</span>}
        </h1>
        <p className={styles.intro}>{description}</p>
      </div>
      <Link href="/2003/join?new=1" className={styles.create}>
        <Plus size={19} aria-hidden="true" />
        Шинээр үүсгэх
      </Link>
    </header>
  );
}
export function ListingCard({
  listing,
  href,
  onEdit,
}: { listing: ListingSummary } & EditAction) {
  const label = `${listing.title} — засах`;
  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <span className={styles.status} data-published={listing.published}>
          {listing.published ? (
            <Globe2 size={13} aria-hidden="true" />
          ) : (
            <LockKeyhole size={13} aria-hidden="true" />
          )}
          {listing.published ? "Нийтэлсэн" : "Нийтлээгүй"}
        </span>
      </div>
      <div className={styles.identity}>
        <span className={styles.photo}>
          {listing.photoUrl ? (
            <Image
              src={resolveApiAssetUrl(listing.photoUrl)}
              alt=""
              width={64}
              height={64}
              unoptimized
            />
          ) : (
            <UserRound size={28} aria-hidden="true" />
          )}
        </span>
        <div className={styles.copy}>
          <h2>{listing.title}</h2>
          <p className={styles.name}>{listing.name}</p>
        </div>
      </div>
      {listing.organization && (
        <p className={styles.organization}>{listing.organization}</p>
      )}
      <div className={styles.meta}>
        {listing.profession && <span>{listing.profession}</span>}
        {listing.city && (
          <span>
            <MapPin size={14} aria-hidden="true" />
            {listing.city}
          </span>
        )}
      </div>
      <footer className={styles.cardFooter}>
        <span>
          {listing.published
            ? "Хүрээллийн жагсаалтад харагдана"
            : "Зөвхөн танд харагдана"}
        </span>
        {href ? (
          <Link href={href} className={styles.edit} aria-label={label}>
            <Pencil size={15} aria-hidden="true" />
            Засах
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            className={styles.edit}
            aria-label={label}
          >
            <Pencil size={15} aria-hidden="true" />
            Засах
            <ArrowUpRight size={15} aria-hidden="true" />
          </button>
        )}
      </footer>
    </article>
  );
}
export function EmptyListings() {
  return (
    <section className={styles.empty} role="status">
      <span className={styles.emptyIcon}>
        <FilePlus2 size={30} aria-hidden="true" />
      </span>
      <h2>Таны анхны танилцуулга энд харагдана</h2>
      <p>
        Юугаар тусалж чадахаа хуваалцаж,
        <br />
        хүрээллийнхэнтэйгээ холбогдоорой.
      </p>
      <Link href="/2003/join?new=1" className={styles.create}>
        <Plus size={18} aria-hidden="true" />
        Шинээр үүсгэх
      </Link>
    </section>
  );
}
export function ListingsLoading() {
  return (
    <div
      role="status"
      aria-label="Танилцуулгуудыг ачаалж байна"
      className={styles.grid}
    >
      {[0, 1].map((key) => (
        <div key={key} className={styles.skeleton} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}
