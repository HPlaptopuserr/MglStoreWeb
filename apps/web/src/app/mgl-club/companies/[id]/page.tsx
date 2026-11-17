import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  isClubSiteSlug,
  type ClubWebsite,
  type MglClubMember,
} from "@mgl/types";
import { companySiteOrigin } from "@/lib/company-site-url";
import { API } from "@/lib/api";
import { localCompanies } from "@/features/mgl-club/local-companies";
import { demoCompanies } from "@/features/mgl-club/demo-companies";
import { CompanyDemoWebsite } from "@/features/mgl-club/CompanyDemoWebsite";
import { CompanyWebsite } from "@/features/mgl-club/CompanyWebsite";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const local =
    process.env.NODE_ENV !== "production"
      ? localCompanies.find((company) => company.id === id)
      : undefined;
  return local
    ? {
        title: `${local.businessName} · Эко хөнгөн бетон блокны үйлдвэр`,
        description: local.description,
      }
    : { title: "Байгууллагын танилцуулга • MGL CLUB" };
}
export default async function CompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (process.env.NODE_ENV !== "production" && id === "demo-company-innova")
    redirect(`${companySiteOrigin}/innovallc`);
  if (process.env.NODE_ENV !== "production" && id.startsWith("demo-company-")) {
    const member = [...localCompanies, ...demoCompanies].find(
      (company) => company.id === id,
    );
    if (!member) notFound();
    return <CompanyDemoWebsite member={member} />;
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const response = await fetch(`${API}/forms/mgl-club/members/${id}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 404 || response.status === 400) notFound();
  if (!response.ok) throw new Error("Company unavailable");
  const {
    member,
    website,
    siteSlug,
  }: {
    member: MglClubMember;
    website: ClubWebsite | null;
    siteSlug?: string | null;
  } = await response.json();
  if (isClubSiteSlug(siteSlug)) redirect(`${companySiteOrigin}/${siteSlug}`);
  return <CompanyWebsite member={member} site={website || undefined} />;
}
