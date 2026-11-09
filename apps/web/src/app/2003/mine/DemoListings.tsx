"use client";
import { useCommunityMembership } from "@/features/community-2003/CommunityMembership";
import { useDemoDirectory } from "../community/useDemoDirectory";
import {
  EmptyListings,
  ListingCard,
  ListingsHeader,
  ListingsLoading,
} from "./ListingView";
import styles from "./listings.module.css";
export function DemoListings() {
  const { memberIds, checking } = useCommunityMembership();
  const { data, ready, error } = useDemoDirectory();
  const members = data.members.filter((member) =>
    memberIds?.includes(member.id),
  );
  const loading = checking || !ready;
  return (
    <div className={styles.page}>
      <ListingsHeader count={loading ? undefined : members.length} />
      <p className={styles.notice}>
        LOCAL DEMO · Энэ браузерт үүсгэсэн туршилтын танилцуулгууд.
      </p>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {loading ? (
        <ListingsLoading />
      ) : members.length === 0 ? (
        <EmptyListings />
      ) : (
        <ul className={styles.grid} aria-label="Миний танилцуулгууд">
          {members.map((member) => (
            <li key={member.id}>
              <ListingCard
                listing={{
                  ...member,
                  title:
                    member.offers.join(", ") ||
                    member.role ||
                    member.profession,
                  published: true,
                }}
                href={`/2003/join?edit=${encodeURIComponent(member.id)}`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
