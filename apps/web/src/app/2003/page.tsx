import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { RegistrationIntro } from "./_components/RegistrationIntro";
import styles from "./registration.module.css";
import { RegistrationForm } from "./_components/RegistrationForm";

export const metadata: Metadata = {
  title: "2003 • Танилцах бүртгэл | MGL Store",
  description:
    "Өөрийн мэргэжил, бизнесийн тухай хуваалцаж, холбоотой байцгаая.",
  robots: { index: false, follow: false },
};

export default function CommunityRegistrationPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a href="/" className={styles.brand} aria-label="MGL Store нүүр хуудас">
          <span className={styles.brandMark}>m.</span>MGL STORE
          <span className={styles.brandDivider} />
          2003
        </a>
        <a href="#registration" className={styles.headerLink}>
          Танилцах бүртгэл <ArrowUpRight size={16} />
        </a>
      </header>
      <div className={styles.layout}>
        <RegistrationIntro />
        <RegistrationForm />
      </div>
      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} MGL Store</span>
        <span>
          Монгол мөнгө Монголдоо <span aria-hidden="true">↗</span>
        </span>
      </footer>
    </div>
  );
}
