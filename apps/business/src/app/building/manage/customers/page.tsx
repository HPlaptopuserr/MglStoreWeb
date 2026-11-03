import { CustomersPage } from "@/features/building/customers/CustomersPage";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ reservation?: string | string[] }>;
}) {
  const params = await searchParams;
  const reservation = typeof params.reservation === "string" ? params.reservation : "";
  return <CustomersPage key={reservation} initialReservation={reservation} />;
}
