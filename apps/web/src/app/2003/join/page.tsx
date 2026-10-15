import type { Metadata } from "next";
import { JoinDemo } from "./JoinDemo";
import LegacyRegistration from "./LegacyRegistration";
export const metadata: Metadata = {
  title: "2003 • Нэгдэх",
  robots: { index: false, follow: false },
};
export default function JoinPage() {
  return process.env.NODE_ENV === "development" ? (
    <JoinDemo />
  ) : (
    <LegacyRegistration />
  );
}
