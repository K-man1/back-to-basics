import type { Project } from "@/lib/projects";

const STATUS_META: Record<Project["status"], { label: string; className: string }> = {
  draft: { label: "Draft", className: "border-zinc-300 text-zinc-500" },
  submitted: { label: "In review", className: "border-amber-300 text-amber-700" },
  changes_requested: {
    label: "Changes requested",
    className: "border-orange-300 text-orange-700",
  },
  approved: { label: "Approved", className: "border-green-300 text-green-700" },
  rejected: { label: "Rejected", className: "border-red-300 text-red-700" },
};

export function statusLabel(status: Project["status"]): string {
  return STATUS_META[status].label;
}

export default function StatusBadge({ status }: { status: Project["status"] }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 text-xs ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}
