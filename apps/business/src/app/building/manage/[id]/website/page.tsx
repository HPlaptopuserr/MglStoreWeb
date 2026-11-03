import { WebsiteManager } from "@/features/building/website/WebsiteManager";
export default async function WebsitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <WebsiteManager id={(await params).id} />;
}
