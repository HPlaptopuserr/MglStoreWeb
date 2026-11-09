import type { Metadata } from "next";
import { JoinDemo } from "./JoinDemo";
import LegacyRegistration from "./LegacyRegistration";
export const metadata: Metadata = {
  title: "2003 • Нэгдэх",
  robots: { index: false, follow: false },
};
export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; edit?: string }>;
}) {
  const params = await searchParams;
  return process.env.NODE_ENV === "development" ? (
    <JoinDemo key={params.edit || "new"} editId={params.edit} />
  ) : (
    <LegacyRegistration createNew={params.new === "1"} />
  );
}
