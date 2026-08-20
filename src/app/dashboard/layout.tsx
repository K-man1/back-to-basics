import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import DashboardNav from "@/components/DashboardNav";
import { getOrCreateStudent } from "@/lib/students";
import { getReviewerForStudent } from "@/lib/reviewers";
import { approvedCoinsForStudent } from "@/lib/balance";
import { AI_PLUGIN_ENABLED } from "@/lib/features";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-32">
        <p className="text-sm text-zinc-500">[*] dashboard</p>
        <h1 className="mt-4 text-2xl tracking-tight text-zinc-900">
          Sign in to see what you&apos;ve learned.
        </h1>
        <form
          action={async () => {
            "use server";
            await signIn("hackclub", { redirectTo: "/dashboard" });
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

  // A brand-new student sees the AI-app picker once, before their first
  // dashboard view, instead of a separate onboarding page.
  const student = await getOrCreateStudent(
    session.user.id,
    session.user.slackId,
    session.user.name ?? null,
    session.user.email ?? null,
  );
  if (AI_PLUGIN_ENABLED && student.isNew) {
    redirect("/editors?next=/dashboard");
  }

  const reviewer = await getReviewerForStudent(student.id);

  // Coins the student has actually been awarded (approved projects only),
  // shown in the nav so it's visible from every screen.
  const coins = await approvedCoinsForStudent(student);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-12">
      <DashboardNav showReview={!!reviewer} coins={coins} />
      <div className="flex-1 py-10">{children}</div>
    </div>
  );
}
