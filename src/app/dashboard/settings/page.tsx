import { auth } from "@/auth";
import { getOrCreateStudent } from "@/lib/students";
import { getHackatimeStatsForStudent } from "@/lib/hackatime";
import { computePoints } from "@/lib/currency";
import { sumReviewPointsForStudent } from "@/lib/reviews";
import { gradesForStudent } from "@/lib/journal";

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

  const grades = await gradesForStudent(student.id);
  const reviewAdjustment = await sumReviewPointsForStudent(student.id);
  const points = computePoints(
    hackatimeStats?.totalSeconds ?? 0,
    grades,
    reviewAdjustment,
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm text-zinc-500">[*] settings</p>
        <h1 className="mt-2 text-2xl tracking-tight text-zinc-900">Settings</h1>
      </div>

      <div className="flex gap-6 text-sm">
        <div>
          <p className="text-2xl text-zinc-900">{points}</p>
          <p className="text-zinc-500">points (placeholder currency)</p>
        </div>
        <div>
          <p className="text-2xl text-zinc-900">
            {hackatimeStats ? (hackatimeStats.totalSeconds / 3600).toFixed(2) : "—"}
          </p>
          <p className="text-zinc-500">hours coded total</p>
        </div>
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
        <p className="font-semibold text-zinc-900">Lapse</p>
        <p className="mt-1 text-zinc-600">
          Record timelapses of your work sessions with{" "}
          <a
            href="https://lapse.hackclub.com"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-zinc-900"
          >
            Lapse
          </a>
          . Keep it running while you build — your timelapse backs up your
          learning journal when a reviewer looks at your project.
        </p>
      </div>
    </div>
  );
}
