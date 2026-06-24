import { RestaurantQrMenuScreen } from "@/components/restaurant/RestaurantQrMenuScreen";

export default async function RestaurantQrMenuPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <RestaurantQrMenuScreen token={token} />;
}
