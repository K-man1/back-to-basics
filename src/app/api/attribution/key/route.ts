import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOrCreateStudent } from "@/lib/students";
import { issueKey } from "@/lib/attribution";
import { aiPluginOffResponse } from "@/app/api/attribution/guard";

// Issues (or rotates) this student's plugin key.
//
// Session-authenticated, unlike /api/attribution/sync which is called by the
// plugin with a Bearer token. The plaintext key is returned here exactly once
// and never stored — only its SHA-256 goes to the database — so the client has
// to show it immediately or the student has to rotate for a new one.

export const dynamic = "force-dynamic";

export async function POST() {
  const off = aiPluginOffResponse();
  if (off) return off;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const student = await getOrCreateStudent(
    session.user.id,
    session.user.slackId,
    session.user.name ?? null,
    session.user.email ?? null,
  );

  const key = await issueKey(student.id);
  return NextResponse.json({ key, studentId: student.id });
}
