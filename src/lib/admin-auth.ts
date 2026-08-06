import { timingSafeEqual } from "crypto";

// Shared-secret auth for machine callers that aren't a signed-in student —
// currently just the attribution verification worker.
//
// Separate from the per-student plugin keys in src/lib/attribution.ts: those
// identify a student and carry no privilege, this one is a single operator
// credential that can write verification results for anyone. Keep it in
// ATTRIBUTION_ADMIN_KEY and never ship it to a client.
export function isAdminRequest(req: Request): boolean {
  const expected = process.env.ATTRIBUTION_ADMIN_KEY ?? "";
  // An unset secret must fail closed. Without this an empty env var would make
  // every request with an empty token an admin.
  if (expected.length < 16) return false;

  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (token.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
