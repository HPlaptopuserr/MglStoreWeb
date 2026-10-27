import { NextResponse } from "next/server";
import {
  workforceApiBase,
  workforceSameOrigin,
  workforceToken,
  workforceUnavailable,
} from "@/lib/server/workforce-session";
const allowed: Record<string, RegExp> = {
  GET: /^(employees\/[a-zA-Z0-9-]+|work-tasks|work-tasks\/export|work-tasks\/evidence\/[a-zA-Z0-9-]+|snapshot|export|self|tracking|mail|billing|billing\/[a-zA-Z0-9-]+)$/,
  POST: /^(manual-attendance|work-tasks|employees\/[a-zA-Z0-9-]+\/offboard|employees\/assign-department|pulse|tracking\/consent|tracking\/points|mail|departments|employees|shifts|assignments|zones|notices|requests|requests\/decide|requests\/[a-zA-Z0-9-]+\/cancel|notices\/[a-zA-Z0-9-]+\/read|tokens|billing|billing\/[a-zA-Z0-9-]+\/check)$/,
  PATCH:
    /^(work-tasks\/[a-zA-Z0-9-]+\/approve|policy|departments\/[a-zA-Z0-9-]+|employees\/[a-zA-Z0-9-]+|zones\/[a-zA-Z0-9-]+|shifts\/[a-zA-Z0-9-]+)$/,
  DELETE: /^(departments|assignments|tokens)\/[a-zA-Z0-9-]+$/,
};
async function forward(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const target = path.join("/");
  if (!allowed[request.method]?.test(target))
    return NextResponse.json({ message: "Хуудас олдсонгүй" }, { status: 404 });
  if (request.method !== "GET" && !workforceSameOrigin(request))
    return NextResponse.json(
      { message: "Хүсэлтийн эх сурвалж буруу" },
      { status: 403 },
    );
  const token = await workforceToken();
  if (!token)
    return NextResponse.json({ message: "Нэвтэрнэ үү" }, { status: 401 });
  try {
    const result = await fetch(
      `${workforceApiBase}/api/workforce/${target}${new URL(request.url).search}`,
      {
        method: request.method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: request.method === "GET" ? undefined : await request.text(),
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      },
    );
    if (
      (target === "export" ||
        target === "work-tasks/export" ||
        target.startsWith("work-tasks/evidence/")) &&
      result.ok
    )
      return new NextResponse(await result.arrayBuffer(), {
        headers: {
          "Content-Type":
            result.headers.get("content-type") ?? "application/octet-stream",
          "Content-Disposition":
            result.headers.get("content-disposition") ?? "attachment",
          "Cache-Control": "no-store",
        },
      });
    return NextResponse.json((await result.json()) as unknown, {
      status: result.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return workforceUnavailable();
  }
}
export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const DELETE = forward;
