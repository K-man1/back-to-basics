import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { appUrl } from "@/lib/app-url";
import { getOrCreateStudent, setHackatimeAccessToken } from "@/lib/students";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(appUrl("/dashboard", req));
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const expectedState = req.cookies.get("hackatime_oauth_state")?.value;
  const next = "/dashboard/settings";

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(
      appUrl(`${next}?hackatime_error=state`, req),
    );
  }

  const redirectUri = appUrl("/api/hackatime/callback", req);

  const tokenRes = await fetch("https://hackatime.hackclub.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.HACKATIME_CLIENT_ID ?? "",
      client_secret: process.env.HACKATIME_CLIENT_SECRET ?? "",
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      appUrl(`${next}?hackatime_error=token`, req),
    );
  }

  const tokenBody = await tokenRes.json().catch(() => null);
  const accessToken = tokenBody?.access_token;
  if (typeof accessToken !== "string") {
    return NextResponse.redirect(
      appUrl(`${next}?hackatime_error=token`, req),
    );
  }

  const student = await getOrCreateStudent(
    session.user.id,
    session.user.slackId,
    session.user.name ?? null,
    session.user.email ?? null,
  );
  await setHackatimeAccessToken(student.id, accessToken);

  const res = NextResponse.redirect(appUrl(next, req));
  res.cookies.delete("hackatime_oauth_state");
  return res;
}
