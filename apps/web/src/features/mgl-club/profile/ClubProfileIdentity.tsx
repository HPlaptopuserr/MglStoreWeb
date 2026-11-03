import { ArrowUpRight, AtSign, Network, Phone, UserRound } from "lucide-react";
import type { AuthUser } from "@/lib/auth-context";
import styles from "./club-profile.module.css";

interface ClubProfileIdentityProps {
  user: AuthUser | null;
  onSignIn: () => void;
}

export function ClubProfileIdentity({
  user,
  onSignIn,
}: ClubProfileIdentityProps) {
  const name = user?.fullName?.trim() || "MGL хэрэглэгч";
  return (
    <section className={styles.identity} aria-labelledby="club-identity-title">
      <div className={styles.identityTop}>
        <span className={styles.avatar} aria-hidden="true">
          {user ? (
            name.slice(0, 1).toUpperCase()
          ) : (
            <UserRound size={30} strokeWidth={1.5} />
          )}
        </span>
        <span className={styles.clubLabel}>
          <Network size={13} aria-hidden="true" /> MGL CLUB
        </span>
      </div>
      <h2 id="club-identity-title">
        {user ? name : "Танилцаад, хамтдаа өсөцгөөе."}
      </h2>
      <p>
        {user
          ? "Таны бизнесийн шинэ боломж, хамтын ажиллагаа эндээс эхэлнэ."
          : "Өөрийгөө танилцуулж, бизнесийн шинэ хүрээлэлтэй болоорой."}
      </p>
      {user ? (
        <dl className={styles.contactDetails}>
          {user.phone && (
            <div>
              <dt>
                <Phone size={15} aria-hidden="true" />
                <span className={styles.srOnly}>Утас</span>
              </dt>
              <dd>{user.phone}</dd>
            </div>
          )}
          {user.email && (
            <div>
              <dt>
                <AtSign size={15} aria-hidden="true" />
                <span className={styles.srOnly}>Имэйл</span>
              </dt>
              <dd>{user.email}</dd>
            </div>
          )}
        </dl>
      ) : (
        <>
          <button className={styles.signIn} onClick={onSignIn}>
            Нэвтрэх / Бүртгүүлэх <ArrowUpRight size={18} aria-hidden="true" />
          </button>
          <span className={styles.identityNote}>
            Өөрийн MGL бүртгэлээр нэвтрээрэй
          </span>
        </>
      )}
    </section>
  );
}
