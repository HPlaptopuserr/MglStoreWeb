"use client";
import { CompanyLogo } from "./CompanyLogo";
import { localCompanies } from "./local-companies";
import Link from "next/link";
import { demoCompanies } from "./demo-companies";
import styles from "./companies.module.css";

/** Preview assets never create memberships or payment records. */
export function ClubDemoLogos() {
  return (
    <div className={styles.demoPreview}>
      <p className={styles.demoLabel}>
        Локал танилцуулгууд, туршилтын логонууд · Төлбөр баталгаажаагүй
      </p>
      <div
        className={styles.grid}
        aria-label="Байгууллагын логоны туршилтын харагдац"
      >
        {[...localCompanies, ...demoCompanies].map((member) => (
          <Link
            href={`/mgl-club/companies/${member.id}`}
            aria-label={`${member.businessName}: ${member.isDemo ? "туршилтын " : "локал "}танилцуулга үзэх`}
            className={styles.tile}
            key={member.id}
            title={`${member.businessName} · Локал танилцуулга`}
          >
            <span className={styles.logo}>
              <CompanyLogo name={member.businessName} url={member.logoUrl} />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
