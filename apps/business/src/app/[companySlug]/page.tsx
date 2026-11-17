import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { CLUB_BUSINESS_SITE_ORIGIN } from "@mgl/types";
import { CompanyWebsite } from "@mgl/ui/company-site";
import { getCompanySite } from "@/features/company-site/server/company-site";
import styles from "./site.module.css";

type Props = { params: Promise<{ companySlug: string }> };
export const viewport: Viewport = { themeColor: "#005baa" };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const result = await getCompanySite((await params).companySlug);
  if (!result) return { title: "Байгууллага олдсонгүй" };
  const title = `${result.member.businessName} · Байгууллагын танилцуулга`;
  const url = `${CLUB_BUSINESS_SITE_ORIGIN}/${result.siteSlug}`;
  return {
    title: { absolute: title },
    description: result.member.description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: result.member.description,
      url,
      siteName: result.member.businessName,
    },
  };
}

export default async function CompanySitePage({ params }: Props) {
  const result = await getCompanySite((await params).companySlug);
  if (!result) notFound();
  const webOrigin = (
    process.env.NEXT_PUBLIC_STORE_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://mglstore.mn"
      : "http://localhost:3000")
  ).replace(/\/$/, "");
  return (
    <main className={styles.page}>
      <CompanyWebsite
        member={result.member}
        site={result.website || undefined}
        clubHref={`${webOrigin}/mgl-club`}
      />
    </main>
  );
}
