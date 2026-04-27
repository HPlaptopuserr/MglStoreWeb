import { notFound, redirect } from "next/navigation";
import { API } from "@/lib/api";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function checkSubdomainEnabled(slug: string): Promise<boolean> {
  try {
    const res = await fetch(`${API}/partners/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.subdomainEnabled;
  } catch {
    return false;
  }
}

export default async function StorePage({ params }: PageProps) {
  const { slug } = await params;

  const enabled = await checkSubdomainEnabled(slug);
  if (!enabled) return notFound();

  redirect(`/organizations/${slug}`);
}
