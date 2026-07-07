import { redirect } from "next/navigation";
import GridBackground from "@/components/GridBackground";
import { auth, signIn } from "@/auth";
import { getOrCreateStudent } from "@/lib/students";

export default async function Home() {
  const session = await auth();
  if (session?.user?.id) {
    const student = await getOrCreateStudent(
      session.user.id,
      session.user.slackId,
      session.user.name ?? null,
      session.user.email ?? null,
    );
    redirect(student.onboarded_at ? "/dashboard" : "/onboarding");
  }

  return (
    <div className="flex flex-1 flex-col">
      <GridBackground />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-32">
        <p className="text-sm text-zinc-500">[*] back to basics</p>
        <h1 className="mt-4 max-w-lg text-3xl leading-tight tracking-tight text-zinc-900">
          Learn to code for real, not just ship it.
        </h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-zinc-600">
          Placeholder copy — real content goes here once the program details
          are worked out.
        </p>
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
    </div>
  );
}
