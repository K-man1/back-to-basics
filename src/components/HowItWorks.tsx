const STEPS = [
  {
    title: "Build",
    body: "Create a polished software project with any tools while tracking your time with Hackatime.",
  },
  {
    title: "Journal",
    body: "Journal what you learn as you build while referencing code you wrote.",
  },
  {
    title: "Get Reviewed",
    body: "Reviewers grade the time spent coding and learning, and reward coins based off of that.",
  },
  {
    title: "Earn Prizes",
    body: "Use your coins to buy stuff in the shop, like 3D printers, Raspberry Pi's and so much more!",
  },
];

// Four plain steps, all visible at once. This used to be a click-through rail
// that hid three of the four behind a tab — on a page whose whole job is
// explaining the program, hiding the explanation was the wrong trade.
export default function HowItWorks() {
  return (
    <ol className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
      {STEPS.map((step, i) => (
        <li key={step.title} className="flex gap-4">
          <span className="mt-0.5 shrink-0 text-sm text-zinc-300">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div>
            <h3 className="text-sm font-bold text-zinc-900">{step.title}</h3>
            <p className="mt-2 max-w-xs text-sm leading-7 text-zinc-600">
              {step.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
