import { InquiryInbox } from "@/features/building/inquiries/InquiryInbox";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const input = Number((await searchParams).page ?? 1);
  const page =
    Number.isInteger(input) && input > 0 && input <= 100000 ? input : 1;
  return <InquiryInbox page={page} />;
}
