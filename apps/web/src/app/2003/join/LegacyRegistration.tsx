import type { Metadata } from "next";
import { RegistrationIntro } from "../_components/RegistrationIntro";
import styles from "../registration.module.css";
import { RegistrationForm } from "../_components/RegistrationForm";

export const metadata: Metadata = {
  title: "2003 • Танилцах бүртгэл | MGL Store",
  description:
    "Өөрийн мэргэжил, бизнесийн тухай хуваалцаж, холбоотой байцгаая.",
  robots: { index: false, follow: false },
};

export default function CommunityRegistrationPage() {
  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <RegistrationIntro />
        <RegistrationForm />
      </div>
    </div>
  );
}
