"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import {
  UserRound,
  ArrowUpRight,
  CirclePlus,
  UsersRound,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import styles from "./community-profile.module.css";
const AuthDialog = dynamic(
  () => import("@/features/auth/CommunityAuthDialog"),
  { ssr: false, loading: () => <p role="status">Нэвтрэлт ачаалж байна…</p> },
);
export function CommunityProfile() {
  const { user, loading, logout } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  if (loading)
    return (
      <div
        className={styles.page}
        role="status"
        aria-label="Профайл ачаалж байна"
      >
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
      </div>
    );
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <p>ТАНЫ ХҮРЭЭЛЭЛ</p>
        <h1>Миний 2003</h1>
        <span>Холбоотой байж, хамтдаа бүтээе.</span>
      </header>
      <section className={styles.identity} aria-labelledby="identity-title">
        <span className={styles.avatar}>
          {user ? (
            (user.fullName?.trim() || "M").slice(0, 1)
          ) : (
            <UserRound size={30} aria-hidden="true" />
          )}
        </span>
        <span className={styles.badge}>2003 · БИДНИЙ ХҮРЭЭЛЭЛ</span>
        <h2 id="identity-title">
          {user
            ? user.fullName || "MGL хэрэглэгч"
            : "Танилцаад, холбоотой байя."}
        </h2>
        <p>
          {user
            ? "Таны MGL бүртгэлээр нэвтэрсэн байна."
            : "Өөрийн MGL бүртгэлээр нэвтэрч, хүрээллийнхээ нэг хэсэг болоорой."}
        </p>
        {user ? (
          <dl className={styles.details}>
            {user.phone && (
              <div>
                <dt>Утас</dt>
                <dd>{user.phone}</dd>
              </div>
            )}
            {user.email && (
              <div>
                <dt>Имэйл</dt>
                <dd>{user.email}</dd>
              </div>
            )}
          </dl>
        ) : (
          <button className={styles.primary} onClick={() => setAuthOpen(true)}>
            Нэвтрэх / Бүртгүүлэх <ArrowUpRight size={18} aria-hidden="true" />
          </button>
        )}
      </section>
      <section className={styles.actions} aria-label="Миний боломжууд">
        <Link href="/2003/edit">
          <UserRound size={22} aria-hidden="true" />
          <span>
            <b>Мэдээллээ засах</b>
            <small>Өөрийн танилцуулгаа шинэчлэх</small>
          </span>
          <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
        <Link href="/2003/join">
          <CirclePlus size={22} aria-hidden="true" />
          <span>
            <b>Өөрийгөө танилцуулах</b>
            <small>Мэргэжил, туршлага, боломжоо хуваалцах</small>
          </span>
          <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
        <Link href="/2003">
          <UsersRound size={22} aria-hidden="true" />
          <span>
            <b>Хүрээллээ тэлэх</b>
            <small>Найзуудаа олж, дахин холбогдох</small>
          </span>
          <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      </section>
      <p className={styles.note}>
        <ShieldCheck size={19} aria-hidden="true" />
        <span>
          Нэвтрэх бүртгэл болон нийтэд харагдах танилцуулга тусдаа. Танилцуулгыг
          таны нийтлэх зөвшөөрөлтэйгөөр нүүр хуудсанд харуулна.
        </span>
      </p>
      {user && (
        <button className={styles.signOut} onClick={logout}>
          <LogOut size={17} aria-hidden="true" /> Гарах
        </button>
      )}
      {authOpen && !user && (
        <AuthDialog
          onClose={() => setAuthOpen(false)}
          brandName="2003"
          marketingBanner={{
            eyebrow: "БИДНИЙ ХҮРЭЭЛЭЛ",
            title: "Нэг үе. Шинэ боломж.",
            quote: "Танилцъя. Холбогдъё. Хамтдаа бүтээе.",
            href: "/2003",
            cta: "Хүмүүстэй танилцах",
          }}
        />
      )}
    </div>
  );
}
