import { NextResponse } from "next/server";
import { resolveEnablePasswordAuthFlag } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

export async function GET() {
  const enablePasswordAuth = resolveEnablePasswordAuthFlag(
    process.env.NEXT_PUBLIC_ENABLE_PASSWORD_AUTH ?? process.env.ENABLE_PASSWORD_AUTH
  );

  return NextResponse.json(
    { enablePasswordAuth },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
