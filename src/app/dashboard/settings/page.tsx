import { auth, signOut } from "@/auth";
import { getOrCreateStudent } from "@/lib/students";
import { getHackatimeStatsForStudent } from "@/lib/hackatime";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) return null; // layout handles the sign-in gate

  const student = await getOrCreateStudent(
    session.user.id,
    session.user.slackId,
    session.user.name ?? null,
    session.user.email ?? null,
  );

  const hackatimeStats = await getHackatimeStatsForStudent(student);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mt-2 text-2xl tracking-tight text-zinc-900">Settings</h1>
      </div>


      <div className="rounded border border-zinc-200 p-4 text-sm">
        <p className="font-semibold text-zinc-900">Hackatime</p>
        <p className="mt-1 text-zinc-600">
          {hackatimeStats
            ? "Connected and reporting time."
            : student.hackatime_access_token
              ? "Connected, but no coding activity found yet."
              : "Not connected — authorize access to your Hackatime stats below."}
        </p>
        {!student.hackatime_access_token ? (
          <a
            href="/api/hackatime/connect"
            className="mt-2 inline-block w-fit rounded border border-zinc-900 px-3 py-1.5 text-xs text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white"
          >
            Connect Hackatime
          </a>
        ) : null}
      </div>

      <div className="rounded border border-zinc-200 p-4 text-sm">
        <p className="font-semibold text-zinc-900">Account</p>
        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <button
            type="submit"
            className="mt-2 w-fit rounded border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:border-zinc-900 hover:text-zinc-900"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
