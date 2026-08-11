import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ oid?: string }>;
};

export default async function OrganizationShortLinkPage(props: PageProps) {
  const { id } = await props.params;
  const searchParams: { oid?: string } = props.searchParams
    ? await props.searchParams
    : {};
  const query = new URLSearchParams();
  if (searchParams.oid?.trim()) query.set("oid", searchParams.oid.trim());
  const suffix = query.size ? `?${query.toString()}` : "";
  redirect(`/organizations/${encodeURIComponent(id)}${suffix}`);
}
