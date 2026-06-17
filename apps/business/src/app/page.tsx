import { BusinessLivePage } from "@/components/BusinessLivePage";
import { BusinessMaintenancePage } from "@/components/BusinessMaintenancePage";
import { getBusinessSiteStatus } from "@/lib/business-status";

export default async function BusinessPage() {
  const status = await getBusinessSiteStatus();
  return status === "live" ? <BusinessLivePage /> : <BusinessMaintenancePage />;
}
