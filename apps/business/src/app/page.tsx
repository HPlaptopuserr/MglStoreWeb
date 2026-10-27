import { BusinessLivePage } from "@/features/business-intro/BusinessLivePage";
import { getBusinessSiteStatus } from "@/features/business-intro/server/business-status";

export default async function BusinessPage() {
  const status = await getBusinessSiteStatus();
  return <BusinessLivePage maintenance={status !== "live"} />;
}
