"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { LoaderCircle, LogOut, Network } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ClubProfileIdentity } from "./ClubProfileIdentity";
import { ClubProfileActions } from "./ClubProfileActions";
import styles from "./club-profile.module.css";

const ClubAuthDialog = dynamic(() => import("./ClubAuthDialog"), {
  ssr: false,
  loading: () => (
    <div className={styles.authLoading} role="status">
      <LoaderCircle size={22} className={styles.spinner} aria-hidden="true" />
      Нэвтрэлт ачаалж байна…
    </div>
  ),
});

export function ClubProfile() {
  const { user, loading, logout, refreshUser } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const userId = user?.id;
  useEffect(() => {
    if (userId) void refreshUser();
  }, [userId, refreshUser]);

  if (loading)
    return (
      <div
        className={styles.layout}
        role="status"
        aria-label="Клубийн профайл ачаалж байна"
      >
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
      </div>
    );

  return (
    <div className={styles.layout}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>ТАНЫ КЛУБИЙН ОРОН ЗАЙ</p>
          <h1>Миний клуб</h1>
        </div>
        <span className={styles.headingIcon}>
          <Network size={21} aria-hidden="true" />
        </span>
      </header>
      <div className={styles.profileGrid}>
        <div className={styles.identityColumn}>
          <ClubProfileIdentity user={user} onSignIn={() => setAuthOpen(true)} />
          <p className={styles.sessionNote}>
            Клубт MGL бүртгэлээрээ нэвтэрнэ. Апп дээр нэвтэрсэн байсан ч энд
            дахин нэвтрэх шаардлагатай байж болно.
          </p>
          {user && (
            <button className={styles.signOut} onClick={logout}>
              <LogOut size={17} aria-hidden="true" /> Клубээс гарах
            </button>
          )}
        </div>
        <div className={styles.contentColumn}>
          <ClubProfileActions />
        </div>
      </div>
      {authOpen && !user && (
        <ClubAuthDialog onClose={() => setAuthOpen(false)} />
      )}
    </div>
  );
}
