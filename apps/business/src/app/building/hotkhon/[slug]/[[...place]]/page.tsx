import { BuildingPlacePage } from "@/features/building/website/BuildingPlacePage";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; place?: string[] }>;
}) {
  return <BuildingPlacePage {...await params} />;
}
