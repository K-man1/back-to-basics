import PointsCalculator from "@/components/PointsCalculator";

export default function ShopPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl tracking-tight text-zinc-900">
          Coming (hopefully) soon
        </h1>
        <p className="max-w-md text-sm text-zinc-600">
          We are still looking for a sponsor!
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-900">
          Points calculator
        </h2>
        <p className="mt-1 max-w-md text-xs text-zinc-500">
          Estimate what a project could earn. Points are a placeholder — the
          name and final weighting aren&apos;t decided yet.
        </p>
        <div className="mt-4 max-w-md">
          <PointsCalculator />
        </div>
      </div>
    </div>
  );
}
