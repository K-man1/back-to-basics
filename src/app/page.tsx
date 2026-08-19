import Link from "next/link";
import { redirect } from "next/navigation";
import GridBackground from "@/components/GridBackground";
import ScrambleText from "@/components/ScrambleText";
import HowItWorks from "@/components/HowItWorks";
import { auth, signIn } from "@/auth";

// Single source of truth for the sign-in flow — reused by the nav, the hero
// and the closing CTA below.
async function signInAction() {
  "use server";
  await signIn("hackclub", { redirectTo: "/dashboard" });
}

function SignInButton({
  label = "Sign in with Hack Club",
  variant = "solid",
}: {
  label?: string;
  variant?: "solid" | "ghost";
}) {
  const styles =
    variant === "solid"
      ? "border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-700 hover:border-zinc-700"
      : "border-zinc-300 text-zinc-900 hover:border-zinc-900";
  return (
    <form action={signInAction}>
      <button
        type="submit"
        className={`w-fit rounded border px-4 py-2 text-sm transition-colors ${styles}`}
      >
        {label}
      </button>
    </form>
  );
}

const FAQS = [
  {
    q: "What is Back to Basics?",
    a: "Back to Basics is a Hack Club YSWS (You Ship, We Ship) program. You build personal coding projects and keep a journal explaining what you. In return, you can earn prizes based of how much you code, and how much you learned.",
  },
  {
    q: "What's the limit on AI coding?",
    a: "None! However, unpolished projects will be rejected and more AI usage with fewer journals will not be rewarded well.",
  },
  {
    q: "What's a learning journal?",
    a: "The learning journal is a collection of entries you write as you learn more programming concepts. Reviewers will grade these journals and award coins as you learn how to write code yourself. You will be encouraged to use Lapse and reference code you wrote.",
  },
  {
    q: "What's Lapse?",
    a: "Hack Club's screen-timelapse recorder (lapse.hackclub.com). It records your build sessions and syncs your coding time with Hackatime, so reviewers can see the work behind each journal entry.",
  },
  {
    q: "Do I need to be an advanced programmer?",
    a: "No, beginners are welcome. You're graded on understanding relative to what you built, not on how impressive the project looks.",
  },
  {
    q: "Who's eligible?",
    a: "High schoolers aged 13–18, from anywhere in the world!",
  },
  {
    q: "Is this legit? What's Hack Club?",
    a: "Hack Club is a global nonprofit network of teenage hackers, makers, and coders, with programs run by and for high schoolers. Back to Basics is one of its YSWS programs.",
  },
];

export default async function Home() {
  const session = await auth();
  if (session?.user?.id) {
    // Dashboard layout handles routing a brand-new student to /editors first.
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col">
      <GridBackground />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6">
        {/* Hero */}
        <section className="max-w-2xl py-28 sm:py-36">
          <h1 className="mt-5 text-5xl leading-none tracking-tight text-zinc-900 sm:text-6xl">
            <ScrambleText text="Back to Basics" />
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-zinc-700">
            Build real projects, journal what you learn, and get rewarded for
            understanding your code — not just shipping it.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <SignInButton label="Sign in with Hack Club →" />
            <Link
              href="/docs"
              className="w-fit rounded border border-zinc-300 px-4 py-2 text-sm text-zinc-900 transition-colors hover:border-zinc-900"
            >
              Read the docs
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 border-t border-zinc-200 py-20">
          <h2 className="text-2xl tracking-tight text-zinc-900 sm:text-3xl">
            How It Works
          </h2>
          <HowItWorks />
        </section>

        {/* FAQ */}
        <section className="border-t border-zinc-200 py-20">
          <h2 className="mt-4 text-2xl tracking-tight text-zinc-900 sm:text-3xl">
            FAQ
          </h2>
          <div className="mt-8 max-w-3xl divide-y divide-zinc-200 border-y border-zinc-200">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm text-zinc-900 marker:content-none">
                  <span>{faq.q}</span>
                  <span className="text-zinc-400 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="pb-5 text-sm leading-7 text-zinc-600">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="border-t border-zinc-200 py-24 text-center">
          <h2 className="mx-auto max-w-lg text-2xl leading-snug tracking-tight text-zinc-900 sm:text-3xl">
            Ready to learn while shipping?
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-zinc-500">
            Sign in with your Hack Club account to start your first project.
          </p>
          <div className="mt-8 flex justify-center">
            <SignInButton label="Sign in with Hack Club →" />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-10 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md leading-6">
            Back to Basics is a program by{" "}
            <a
              href="https://hackclub.com"
              className="text-zinc-900 underline-offset-2 hover:underline"
            >
              Hack Club
            </a>
            , a global nonprofit network of high-school hackers, makers, and
            coders.
          </p>
          <div className="flex gap-4">
            <Link
              href="/docs"
              className="underline-offset-2 hover:text-zinc-900 hover:underline"
            >
              Docs
            </Link>
            <Link
              href="/rubric"
              className="underline-offset-2 hover:text-zinc-900 hover:underline"
            >
              Rubric
            </Link>
            <a
              href="https://hackclub.com"
              className="underline-offset-2 hover:text-zinc-900 hover:underline"
            >
              Hack Club
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
