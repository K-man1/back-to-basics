import { signIn, auth } from "@/auth";
import EditorSetup from "@/components/EditorSetup";
import { getOrCreateStudent } from "@/lib/students";
import { getKeyInfo } from "@/lib/attribution";

// Shared "set up your AI app" page, reached from both onboarding and settings.
// `next` is where Continue returns to; only same-site relative paths are
// allowed so it can't be used as an open redirect.
function safeNext(next: string | undefined): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/dashboard";
}

export default async function EditorsPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await auth();
  const { next } = await searchParams;
  const continueHref = safeNext(next);

  if (!session?.user?.id) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-32">
        <p className="text-sm text-zinc-500">[*] set up your AI app</p>
        <h1 className="mt-4 text-2xl tracking-tight text-zinc-900">
          Sign in to get started.
        </h1>
        <form
          action={async () => {
            "use server";
            await signIn("hackclub", { redirectTo: "/editors" });
          }}
        >
          <button
            type="submit"
            className="mt-6 w-fit rounded border border-zinc-900 px-4 py-2 text-sm text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white"
          >
            Sign in with Hack Club
          </button>
        </form>
      </main>
    );
  }

  const student = await getOrCreateStudent(
    session.user.id,
    session.user.slackId,
    session.user.name ?? null,
    session.user.email ?? null,
  );
  const keyInfo = await getKeyInfo(student.id);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16">
      <p className="text-sm text-zinc-500">[*] set up your AI app</p>
      <h1 className="mt-2 text-2xl tracking-tight text-zinc-900">
        Select your AI app
      </h1>
      <p className="mt-1 text-sm text-zinc-600">
        Pick the app you build with to see its setup steps.
      </p>
      <div className="mt-8">
        <EditorSetup
          continueHref={continueHref}
          hasExistingKey={keyInfo !== null}
          keyPrefix={keyInfo?.key_prefix ?? null}
        />
      </div>
    </main>
  );
}
