import { NextResponse } from "next/server";
import { resolveEnablePasswordAuthFlag, resolveGoogleClientId } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

export async function GET() {
  const enablePasswordAuth = resolveEnablePasswordAuthFlag(
    process.env.NEXT_PUBLIC_ENABLE_PASSWORD_AUTH ?? process.env.ENABLE_PASSWORD_AUTH
  );
  const googleClientId = resolveGoogleClientId(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID
  );

  return NextResponse.json(
    { enablePasswordAuth, googleClientId },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
