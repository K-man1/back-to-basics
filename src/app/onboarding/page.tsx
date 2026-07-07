import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { getOrCreateStudent, markOnboarded } from "@/lib/students";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ hackatime_error?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-32">
        <p className="text-sm text-zinc-500">[*] onboarding</p>
        <h1 className="mt-4 text-2xl tracking-tight text-zinc-900">
          Sign in to get started.
        </h1>
        <form
          action={async () => {
            "use server";
            await signIn("hackclub", { redirectTo: "/onboarding" });
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

  const { hackatime_error } = await searchParams;
  const hackatimeConnected = !!student.hackatime_access_token;

  async function completeAction() {
    "use server";
    await markOnboarded(student.id);
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-24">
      <p className="text-sm text-zinc-500">[*] onboarding</p>
      <h1 className="mt-2 text-2xl tracking-tight text-zinc-900">
        Two things to set up, one habit to build.
      </h1>

      <div className="mt-8 flex flex-col gap-6 text-sm">
        <div className="rounded border border-zinc-200 p-4">
          <p className="font-semibold text-zinc-900">
            1. Connect Hackatime{" "}
            {hackatimeConnected ? (
              <span className="ml-1 text-xs font-normal text-green-700">
                ✓ connected
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-zinc-600">
            Hackatime tracks your coding time per project — it&apos;s how your
            hours count toward points. If you haven&apos;t set it up yet, follow
            the editor setup at{" "}
            <a
              href="https://hackatime.hackclub.com"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-zinc-900"
            >
              hackatime.hackclub.com
            </a>{" "}
            first, then authorize access here.
          </p>
          {hackatime_error ? (
            <p className="mt-2 text-xs text-red-600">
              Connecting failed — try again.
            </p>
          ) : null}
          {!hackatimeConnected ? (
            <a
              href="/api/hackatime/connect?next=/onboarding"
              className="mt-3 inline-block w-fit rounded border border-zinc-900 px-3 py-1.5 text-xs text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white"
            >
              Connect Hackatime
            </a>
          ) : null}
        </div>

        <div className="rounded border border-zinc-200 p-4">
          <p className="font-semibold text-zinc-900">2. Install Lapse</p>
          <p className="mt-1 text-zinc-600">
            <a
              href="https://lapse.hackclub.com"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-zinc-900"
            >
              Lapse
            </a>{" "}
            records timelapses of your screen while you build and syncs with
            Hackatime. Keep it recording whenever you work on your project —
            your timelapse is the proof behind your journal, and reviewers
            check it.
          </p>
        </div>

        <div className="rounded border border-zinc-200 p-4">
          <p className="font-semibold text-zinc-900">3. Keep a learning journal</p>
          <p className="mt-1 text-zinc-600">
            This is the part that gets graded. Every time something clicks
            while you build — a concept you finally got, a bug you understood,
            a tradeoff you made — write a short entry on your project&apos;s
            page, in your own words. Reviewers grade demonstrated
            understanding, not just shipped code.
          </p>
        </div>
      </div>

      <form action={completeAction} className="mt-8">
        <button
          type="submit"
          className="w-fit rounded border border-zinc-900 px-4 py-2 text-sm text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white"
        >
          Continue to dashboard
        </button>
      </form>
    </main>
  );
}
