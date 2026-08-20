import { NextResponse } from "next/server";
import { AI_PLUGIN_ENABLED } from "@/lib/features";

// Shared kill switch for every /api/attribution/* handler.
//
// Returns a 404 when the plugin feature is off, or null to continue. 404 rather
// than 403: with the feature disabled these endpoints are not "forbidden to
// you", they are not part of the site, and an installed plugin out in the wild
// should see the same thing as a stranger probing the URL.
//
// The plugin treats every failure from /sync and /records as a non-event — it
// leaves its local ledger untouched and retries later — so an old install that
// keeps posting here degrades quietly instead of wedging a student's editor.
export function aiPluginOffResponse(): NextResponse | null {
  if (AI_PLUGIN_ENABLED) return null;
  return NextResponse.json({ error: "not found" }, { status: 404 });
}
