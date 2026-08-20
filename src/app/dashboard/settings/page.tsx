import { auth, signOut } from "@/auth";
import { getOrCreateStudent } from "@/lib/students";
import { getHackatimeStatsForStudent } from "@/lib/hackatime";
import { getKeyInfo, listAgentsForStudent } from "@/lib/attribution";
import { EDITOR_TOOLS } from "@/lib/editors";
import { AI_PLUGIN_ENABLED } from "@/lib/features";
import RelativeTime from "@/components/RelativeTime";
import ThemeToggle from "@/components/ThemeToggle";

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

  // Both of these only feed the "AI apps" card, so skip the queries entirely
  // rather than fetching rows for a card that will not render.
  const agents = AI_PLUGIN_ENABLED ? await listAgentsForStudent(student.id) : [];
  // Whether any computer has ever authenticated with this student's key. The
  // agent rows above cannot answer this: they are written when an app is picked
  // on this page, which is a claim about intent, not about a machine.
  const keyInfo = AI_PLUGIN_ENABLED ? await getKeyInfo(student.id) : null;
  const keyEverUsed = keyInfo?.last_used_at != null;

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

      {AI_PLUGIN_ENABLED ? (
      <div className="rounded border border-zinc-200 p-4 text-sm">
        <p className="font-semibold text-zinc-900">AI apps</p>

        {agents.length ? (
          <ul className="mt-3 flex flex-col gap-2">
            {agents.map((agent) => {
              const label =
                EDITOR_TOOLS.find((t) => t.slug === agent.slug)?.label ??
                agent.slug;
              const working = agent.first_activity_at !== null;
              return (
                <li
                  key={agent.slug}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1"
                >
                  <span
                    aria-hidden
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      working ? "bg-green-600" : "bg-amber-500"
                    }`}
                  />
                  <span className="text-zinc-900">{label}</span>
                  <span
                    className={working ? "text-green-700" : "text-amber-700"}
                  >
                    {working ? "connected and working" : "connected"}
                  </span>
                  {working && agent.last_activity_at ? (
                    <span className="text-xs text-zinc-500">
                      last reported{" "}
                      <RelativeTime iso={agent.last_activity_at} />
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500">
                      waiting for its first edit
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-1 text-zinc-600">
            No AI apps set up yet.
          </p>
        )}

        <p className="mt-3 text-xs text-zinc-500">
          &ldquo;Connected&rdquo; means you picked the app here.
          &ldquo;Connected and working&rdquo; means we have actually received
          code from it — that is the one that counts.
        </p>

        {/*
          The specific, actionable version of "connected but not working". An
          app can be stuck there for several reasons, but exactly one of them is
          visible from here: no computer has ever authenticated with this
          student's key, so the connect step was never run anywhere. Anything
          else (a machine that is set up but idle, a repo opted out) leaves
          last_used_at set, so this note stays off.
        */}
        {agents.length && !keyEverUsed ? (
          <p className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            No computer has connected to your account yet. Picking an app above
            only records which app you use — the plugin also has to be given
            your key, on the computer you build on, or it records your work
            locally and never sends it. Use the button below and run every
            command it shows you.
          </p>
        ) : null}

        <a
          href="/editors?next=/dashboard/settings"
          className="mt-3 inline-block w-fit rounded border border-zinc-900 px-3 py-1.5 text-xs text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white"
        >
          Set up {agents.length ? "another" : "an"} AI app
        </a>
      </div>
      ) : null}

      <div className="rounded border border-zinc-200 p-4 text-sm">
        <p className="font-semibold text-zinc-900">Appearance</p>
        <ThemeToggle />
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
