import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { getOrCreateStudent } from "@/lib/students";
import { getReviewerForStudent } from "@/lib/reviewers";
import { approvedCoinsForStudent } from "@/lib/balance";

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

  // New users must finish onboarding before reaching any dashboard route.
  const student = await getOrCreateStudent(
    session.user.id,
    session.user.slackId,
    session.user.name ?? null,
    session.user.email ?? null,
  );
  if (!student.onboarded_at) {
    redirect("/onboarding");
  }

  const reviewer = await getReviewerForStudent(student.id);

  // Coins the student has actually been awarded (approved projects only),
  // shown in the nav so it's visible from every screen.
  const coins = await approvedCoinsForStudent(student);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-12">
      <nav className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div className="flex gap-6 text-sm text-zinc-600">
          <Link href="/dashboard" className="hover:text-zinc-900">
            My Projects
          </Link>
          <Link href="/dashboard/explore" className="hover:text-zinc-900">
            Explore
          </Link>
          {reviewer ? (
            <Link href="/dashboard/review" className="hover:text-zinc-900">
              Review
            </Link>
          ) : null}
          <Link href="/dashboard/shop" className="hover:text-zinc-900">
            Shop
          </Link>
          <Link href="/dashboard/settings" className="hover:text-zinc-900">
            Settings
          </Link>
        </div>
        <Link
          href="/dashboard/settings"
          className="text-sm text-zinc-900 hover:text-zinc-600"
          title="Coins earned so far"
        >
          {coins} coins
        </Link>
      </nav>
      <div className="flex-1 py-10">{children}</div>
    </div>
  );
}
