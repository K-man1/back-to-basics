import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { recordVerifications, type VerificationResult } from "@/lib/attribution";
import { aiPluginOffResponse } from "@/app/api/attribution/guard";

// Receives verification results from the worker.
//
// Rows here are the only trustworthy attribution numbers on the site: unlike
// /api/attribution/sync, which a student's own machine posts, these come from
// cloning the repository they pushed and checking the ledger against real
// commit history. AttributionSummary switches from "Self-reported" to
// "Verified from GitHub" as soon as a row exists for a repo.

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const off = aiPluginOffResponse();
  if (off) return off;
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: { results?: VerificationResult[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const results = Array.isArray(body?.results) ? body.results : [];
  if (!results.length) {
    return NextResponse.json({ ok: true, recorded: 0 });
  }

  try {
    const recorded = await recordVerifications(results);
    return NextResponse.json({ ok: true, recorded });
  } catch {
    return NextResponse.json({ error: "record failed" }, { status: 500 });
  }
}
