import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { listPendingVerifications } from "@/lib/attribution";

// Work queue for the verification worker: which repos to clone, and which
// commit SHAs we have already seen for each.
//
// The worker cannot run inside the app (verification needs a full git clone
// with complete history), so it lives outside and authenticates with the
// operator key rather than a student session.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const repos = await listPendingVerifications();
  return NextResponse.json({ repos });
}
