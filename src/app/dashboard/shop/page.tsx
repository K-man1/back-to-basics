import Link from "next/link";

export default function ShopPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl tracking-tight text-zinc-900">Coming soon</h1>
      <p className="max-w-md text-sm text-zinc-600">
        Not currently accepting submissions.
      </p>
      <p className="max-w-md text-sm text-zinc-500">
        In the meantime,{" "}
        <Link href="/rubric" className="underline hover:text-zinc-900">
          see how coins are calculated
        </Link>{" "}
        and estimate what a project could earn.
      </p>
    </div>
  );
}
