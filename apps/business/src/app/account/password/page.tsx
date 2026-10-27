import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  BUILDING_SESSION_COOKIE,
  WORKFORCE_SESSION_COOKIE,
} from "@/shared/server/session-cookies";
import { PasswordWorkspace } from "@/features/account/components/PasswordWorkspace";
import { accountContext, loginPath } from "@/features/account/model/password";
export const metadata: Metadata = {
  title: "Нууц үг шинэчлэх",
  robots: { index: false, follow: false },
};
export default async function PasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const context = accountContext(params.context);
  const change = params.mode === "change";
  if (change) {
    const jar = await cookies();
    if (
      !jar.get(
        context === "workforce"
          ? WORKFORCE_SESSION_COOKIE
          : BUILDING_SESSION_COOKIE,
      )?.value
    )
      redirect(loginPath(context));
  }
  return (
    <PasswordWorkspace
      key={`${context}-${change}`}
      context={context}
      change={change}
    />
  );
}
