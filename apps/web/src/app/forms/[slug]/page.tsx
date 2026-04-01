import { API } from "@/lib/api";
import { notFound } from "next/navigation";
import FormFillClient from "./FormFillClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function FormPage({ params }: PageProps) {
  const { slug } = await params;

  const res = await fetch(`${API}/forms/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });

  if (!res.ok) return notFound();

  const form = await res.json();

  return <FormFillClient form={form} />;
}
