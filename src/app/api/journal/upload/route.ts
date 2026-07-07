import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { getOrCreateStudent } from "@/lib/students";
import { supabaseAdmin } from "@/lib/supabase";

const BUCKET = "journal-screenshots";
const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

// Screenshot upload for the learning journal, authenticated by the browser
// session. Files land in a per-student folder in a public bucket; the returned
// URL is what the client embeds into the markdown box as ![](url).
export async function POST(req: NextRequest) {
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

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no file uploaded" }, { status: 400 });
  }

  const ext = EXT_BY_TYPE[file.type];
  if (!ext) {
    return NextResponse.json({ error: "unsupported image type" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const path = `${student.id}/${randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type });

  if (error) {
    return NextResponse.json({ error: "upload failed" }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({ url: publicUrl }, { status: 201 });
}
