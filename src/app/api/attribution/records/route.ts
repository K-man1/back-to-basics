import { NextRequest, NextResponse } from "next/server";
import {
  appendRecords,
  studentIdForKey,
  type LedgerRecord,
} from "@/lib/attribution";
import { aiPluginOffResponse } from "@/app/api/attribution/guard";

// Receives ledger records streamed live from the `ai-attribution` plugin.
//
// This is the integrity channel, and the reason attribution numbers on this
// site mean anything. /api/attribution/sync receives a summary the student's
// machine computed about itself; this receives the raw append-only records,
// which we store immutably. A student can rewrite the ledger in their own repo
// and force-push, but they cannot reach rows already in our database, so the
// history-rewriting attack that used to require catching stops working.
//
// Authenticated with the same per-student key as /sync. The key identifies a
// machine; it does not make anything it says true. Trust comes from the records
// being immutable once stored and from checking them against the pushed repo at
// submission time.
//
// The plugin treats every failure here as a non-event: the ledger on disk is
// untouched, its watermark does not move, and it retries on the next session.
// So returning an error is always safe and never wedges a student's editor.

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 2 * 1024 * 1024;

interface Body {
  repo?: { key?: string; name?: string; remote?: string | null };
  records?: LedgerRecord[];
}

export async function POST(req: NextRequest) {
  const off = aiPluginOffResponse();
  if (off) return off;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ error: "missing bearer token" }, { status: 401 });
  }

  // Size-check before authenticating, so an oversized payload is rejected on
  // size rather than fully parsed for a caller we have not identified yet.
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }

  const studentId = await studentIdForKey(token);
  if (!studentId) {
    return NextResponse.json({ error: "unknown key" }, { status: 401 });
  }

  let body: Body;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const key = body?.repo?.key;
  if (typeof key !== "string" || !key) {
    return NextResponse.json({ error: "missing repo key" }, { status: 400 });
  }
  const records = Array.isArray(body?.records) ? body.records : [];

  try {
    const outcome = await appendRecords(
      studentId,
      {
        key,
        name: typeof body.repo?.name === "string" ? body.repo.name : key,
        remote: body.repo?.remote ?? null,
      },
      records,
    );
    return NextResponse.json({ ok: true, ...outcome });
  } catch {
    // Opaque on purpose: the caller is an unattended background hook and there
    // is nothing useful it can do with our internal error text.
    return NextResponse.json({ error: "append failed" }, { status: 500 });
  }
}
