import { WebsiteManager } from "@/components/building/content/WebsiteManager";
export default async function WebsitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <WebsiteManager id={(await params).id} />;
}
