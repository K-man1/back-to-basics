import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { appUrl } from "@/lib/app-url";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(appUrl("/dashboard", req));
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = appUrl("/api/hackatime/callback", req);

  // Where the callback should land the user afterwards. Allowlisted so the
  // param can't be abused as an open redirect.
  const next =
    req.nextUrl.searchParams.get("next") === "/onboarding"
      ? "/onboarding"
      : "/dashboard/settings";

  const authorizeUrl = new URL("https://hackatime.hackclub.com/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", process.env.HACKATIME_CLIENT_ID ?? "");
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", "profile read");
  authorizeUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(authorizeUrl);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  } as const;
  res.cookies.set("hackatime_oauth_state", state, cookieOptions);
  res.cookies.set("hackatime_oauth_next", next, cookieOptions);
  return res;
}
