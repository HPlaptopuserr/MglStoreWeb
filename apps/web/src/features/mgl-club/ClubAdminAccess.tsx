"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { isFullAdmin } from "@mgl/types";
import { useAuth } from "@/lib/auth-context";
import styles from "./site-builder.module.css";

export function ClubAdminContent({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  return !loading && user && isFullAdmin(user.role) ? children : null;
}

export function ClubAdminOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <p role="status" className={styles.message}>
        Эрхийг шалгаж байна…
      </p>
    );
  if (!user || !isFullAdmin(user.role))
    return (
      <section className={styles.message}>
        <h1>Байгууллагын мэдээллийн удирдлага</h1>
        <p>
          Байгууллагын танилцуулгын вэб бэлдэх, зураг оруулах болон нийтлэх эрх
          зөвхөн систем админд нээлттэй.
        </p>
        {!user && (
          <Link href="/mgl-club/profile">Систем админаар нэвтрэх ↗</Link>
        )}
        <Link href="/mgl-club">Байгууллагуудыг үзэх ↗</Link>
      </section>
    );
  return children;
}

export function ClubSignedInContent({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  return !loading && user ? children : null;
}

export function ClubSignedInOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <p role="status" className={styles.message}>
        Бүртгэлийг шалгаж байна…
      </p>
    );
  if (!user)
    return (
      <section className={styles.message}>
        <h1>Нэвтэрч үргэлжлүүлнэ үү</h1>
        <p>
          Өөрийн байгууллагын пост, мэдээлэл болон нийтлэлээ удирдахын тулд
          MGL бүртгэлээрээ нэвтэрнэ үү.
        </p>
        <Link href="/mgl-club/profile?signin=1">Нэвтрэх / бүртгүүлэх ↗</Link>
        <Link href="/mgl-club">Байгууллагуудыг үзэх ↗</Link>
      </section>
    );
  return children;
}
