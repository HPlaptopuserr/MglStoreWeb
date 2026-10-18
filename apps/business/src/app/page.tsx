import { BusinessLivePage } from "@/components/BusinessLivePage";
import { getBusinessSiteStatus } from "@/lib/business-status";

export default async function BusinessPage() {
  const status = await getBusinessSiteStatus();
  return <BusinessLivePage maintenance={status !== "live"} />;
}
