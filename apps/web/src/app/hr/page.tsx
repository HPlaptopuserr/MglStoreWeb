import type { Metadata } from "next";
import { HrHubPage } from "./_components/HrHubPage";
import { getHrServiceGroups } from "./_lib/hr-data";

export const metadata: Metadata = {
  title: "Хүний нөөцийн үйлчилгээ | MGL Store",
  description: "Admin-аас оруулсан хүний нөөцийн үйлчилгээ, маягт болон файлууд.",
};

export default async function HrPage() {
  const groups = await getHrServiceGroups();

  return <HrHubPage groups={groups} />;
}
