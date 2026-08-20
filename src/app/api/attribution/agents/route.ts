import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOrCreateStudent } from "@/lib/students";
import { markAgentConnected } from "@/lib/attribution";
import { EDITOR_TOOLS } from "@/lib/editors";
import { aiPluginOffResponse } from "@/app/api/attribution/guard";

// Records that the student set up a given AI app, so Settings can list it.
//
// Session-authenticated and deliberately weak evidence: this fires when a
// student is shown setup commands, which is a statement about what they intend
// to use, not proof anything is installed. The claim only becomes real when
// records arrive carrying that agent slug (see recordAgentActivity), and the
// Settings page shows those two states differently.

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const off = aiPluginOffResponse();
  if (off) return off;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const slug = typeof body?.slug === "string" ? body.slug : "";

  // Allowlisted against the picker's own list rather than length-capped: this
  // column is rendered back into Settings, and only names we already know how
  // to label should ever reach it.
  if (!EDITOR_TOOLS.some((t) => t.slug === slug)) {
    return NextResponse.json({ error: "unknown app" }, { status: 400 });
  }

  const student = await getOrCreateStudent(
    session.user.id,
    session.user.slackId,
    session.user.name ?? null,
    session.user.email ?? null,
  );

  await markAgentConnected(student.id, slug);
  return NextResponse.json({ ok: true });
}
