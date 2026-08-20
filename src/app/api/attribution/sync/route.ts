import { NextRequest, NextResponse } from "next/server";
import { studentIdForKey, upsertSyncedRepos, type SyncedProject } from "@/lib/attribution";
import { aiPluginOffResponse } from "@/app/api/attribution/guard";

// Receives the project index from the `ai-attribution` Claude Code plugin.
//
// Called by a machine, not a browser, so there is no session here: the plugin
// authenticates with a per-student key issued from Settings and sent as a
// Bearer token. See src/lib/attribution.ts for how keys are stored (hashed).
//
// The plugin treats any failure as a non-event and retries on the next session
// end, so returning an error is safe — it will never wedge a student's editor.

// Route Handlers are not cached by default and POST is never cached, but this
// one reads a request header and writes to the database, so make the intent
// explicit rather than relying on that default.
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 512 * 1024;

export async function POST(req: NextRequest) {
  const off = aiPluginOffResponse();
  if (off) return off;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ error: "missing bearer token" }, { status: 401 });
  }

  // Read the body before authenticating so an oversized payload is rejected
  // on size rather than being fully parsed for an unknown caller.
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }

  const studentId = await studentIdForKey(token);
  if (!studentId) {
    return NextResponse.json({ error: "unknown key" }, { status: 401 });
  }

  let body: { projects?: SyncedProject[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const projects = Array.isArray(body?.projects) ? body.projects : [];
  if (!projects.length) {
    return NextResponse.json({ ok: true, synced: 0 });
  }

  try {
    const synced = await upsertSyncedRepos(studentId, projects);
    return NextResponse.json({ ok: true, synced });
  } catch {
    // Deliberately opaque: the caller is an unattended background process and
    // there is nothing useful it can do with our internal error text.
    return NextResponse.json({ error: "sync failed" }, { status: 500 });
  }
}
